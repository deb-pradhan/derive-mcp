export class DeriveApiError extends Error {
    status;
    statusText;
    body;
    constructor(status, statusText, body) {
        super(`HTTP ${status}: ${statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
        this.status = status;
        this.statusText = statusText;
        this.body = body;
        this.name = 'DeriveApiError';
    }
}
const DEFAULT_BASE_URL = 'https://api.lyra.finance';
const DEFAULT_TIMEOUT = 15000;
export class DeriveClient {
    baseUrl;
    timeout;
    metrics;
    startTime;
    constructor(config) {
        this.baseUrl = config?.baseUrl ?? DEFAULT_BASE_URL;
        this.timeout = config?.timeout ?? DEFAULT_TIMEOUT;
        this.startTime = Date.now();
        this.metrics = { requests: 0, errors: {}, uptime_seconds: 0 };
    }
    getMetrics() {
        return {
            ...this.metrics,
            uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
        };
    }
    recordError(status) {
        this.metrics.errors[status] = (this.metrics.errors[status] ?? 0) + 1;
    }
    async post(method, params = {}) {
        this.metrics.requests++;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined));
        try {
            const response = await fetch(`${this.baseUrl}/${method}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(filtered),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                this.recordError(response.status);
                const body = await response.text().catch(() => undefined);
                throw new DeriveApiError(response.status, response.statusText, body);
            }
            const data = await response.json();
            if (data.error) {
                this.recordError(422);
                throw new Error(data.error.message ?? JSON.stringify(data.error));
            }
            return data.result;
        }
        catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof DeriveApiError)
                throw err;
            if (err instanceof DOMException && err.name === 'AbortError') {
                this.recordError(408);
                throw new DeriveApiError(408, `Request timed out after ${this.timeout}ms`);
            }
            throw err;
        }
    }
    getAllCurrencies() {
        return this.post('public/get_all_currencies');
    }
    getCurrency(params) {
        return this.post('public/get_currency', params);
    }
    getAllInstruments(params) {
        return this.post('public/get_all_instruments', params);
    }
    getInstrument(params) {
        return this.post('public/get_instrument', params);
    }
    getTicker(params) {
        return this.post('public/get_ticker', params);
    }
    getTickers(params) {
        return this.post('public/get_tickers', params);
    }
    getSpotFeedHistory(params) {
        return this.post('public/get_spot_feed_history', params);
    }
    getSpotFeedHistoryCandles(params) {
        return this.post('public/get_spot_feed_history_candles', params);
    }
    getFundingRateHistory(params) {
        return this.post('public/get_funding_rate_history', params);
    }
    getInterestRateHistory(params) {
        return this.post('public/get_interest_rate_history', params);
    }
    getOptionSettlementHistory(params) {
        return this.post('public/get_option_settlement_history', params);
    }
    getLatestSignedFeeds(params) {
        return this.post('public/get_latest_signed_feeds', params);
    }
    getLiquidationHistory(params) {
        return this.post('public/get_liquidation_history', params);
    }
    getMargin(params) {
        return this.post('public/get_margin', params);
    }
    getStatistics(params) {
        return this.post('public/statistics', params);
    }
}
