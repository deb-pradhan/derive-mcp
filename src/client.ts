import type {
  DeriveClientConfig,
  GetAllInstrumentsParams,
  GetInstrumentParams,
  GetCurrencyParams,
  GetTickerParams,
  GetTickersParams,
  GetSpotFeedHistoryParams,
  GetSpotFeedHistoryCandlesParams,
  GetFundingRateHistoryParams,
  GetInterestRateHistoryParams,
  GetOptionSettlementHistoryParams,
  GetLatestSignedFeedsParams,
  GetLiquidationHistoryParams,
  GetMarginParams,
  GetStatisticsParams,
  Metrics,
} from './types.js';

export class DeriveApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body?: string,
  ) {
    super(`HTTP ${status}: ${statusText}${body ? ` — ${body.slice(0, 200)}` : ''}`);
    this.name = 'DeriveApiError';
  }
}

const DEFAULT_BASE_URL = 'https://api.lyra.finance';
const DEFAULT_TIMEOUT = 15000;

export class DeriveClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly metrics: Metrics;
  private readonly startTime: number;

  constructor(config?: DeriveClientConfig) {
    this.baseUrl = config?.baseUrl ?? DEFAULT_BASE_URL;
    this.timeout = config?.timeout ?? DEFAULT_TIMEOUT;
    this.startTime = Date.now();
    this.metrics = { requests: 0, errors: {}, uptime_seconds: 0 };
  }

  getMetrics(): Metrics {
    return {
      ...this.metrics,
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  private recordError(status: number): void {
    this.metrics.errors[status] = (this.metrics.errors[status] ?? 0) + 1;
  }

  private async post(method: string, params: object = {}): Promise<unknown> {
    this.metrics.requests++;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const filtered = Object.fromEntries(
      Object.entries(params as Record<string, unknown>).filter(([, v]) => v !== undefined),
    );

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

      const data = await response.json() as { result?: unknown; error?: { message?: string } };
      if (data.error) {
        this.recordError(422);
        throw new Error(data.error.message ?? JSON.stringify(data.error));
      }

      return data.result;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof DeriveApiError) throw err;
      if (err instanceof DOMException && err.name === 'AbortError') {
        this.recordError(408);
        throw new DeriveApiError(408, `Request timed out after ${this.timeout}ms`);
      }
      throw err;
    }
  }

  getAllCurrencies(): Promise<unknown> {
    return this.post('public/get_all_currencies');
  }

  getCurrency(params: GetCurrencyParams): Promise<unknown> {
    return this.post('public/get_currency', params);
  }

  getAllInstruments(params: GetAllInstrumentsParams): Promise<unknown> {
    return this.post('public/get_all_instruments', params);
  }

  getInstrument(params: GetInstrumentParams): Promise<unknown> {
    return this.post('public/get_instrument', params);
  }

  getTicker(params: GetTickerParams): Promise<unknown> {
    return this.post('public/get_ticker', params);
  }

  getTickers(params: GetTickersParams): Promise<unknown> {
    return this.post('public/get_tickers', params);
  }

  getSpotFeedHistory(params: GetSpotFeedHistoryParams): Promise<unknown> {
    return this.post('public/get_spot_feed_history', params);
  }

  getSpotFeedHistoryCandles(params: GetSpotFeedHistoryCandlesParams): Promise<unknown> {
    return this.post('public/get_spot_feed_history_candles', params);
  }

  getFundingRateHistory(params: GetFundingRateHistoryParams): Promise<unknown> {
    return this.post('public/get_funding_rate_history', params);
  }

  getInterestRateHistory(params: GetInterestRateHistoryParams): Promise<unknown> {
    return this.post('public/get_interest_rate_history', params);
  }

  getOptionSettlementHistory(params: GetOptionSettlementHistoryParams): Promise<unknown> {
    return this.post('public/get_option_settlement_history', params);
  }

  getLatestSignedFeeds(params: GetLatestSignedFeedsParams): Promise<unknown> {
    return this.post('public/get_latest_signed_feeds', params);
  }

  getLiquidationHistory(params: GetLiquidationHistoryParams): Promise<unknown> {
    return this.post('public/get_liquidation_history', params);
  }

  getMargin(params: GetMarginParams): Promise<unknown> {
    return this.post('public/get_margin', params);
  }

  getStatistics(params: GetStatisticsParams): Promise<unknown> {
    return this.post('public/statistics', params);
  }
}
