import type { DeriveClientConfig, GetAllInstrumentsParams, GetInstrumentParams, GetCurrencyParams, GetTickerParams, GetTickersParams, GetSpotFeedHistoryParams, GetSpotFeedHistoryCandlesParams, GetFundingRateHistoryParams, GetInterestRateHistoryParams, GetOptionSettlementHistoryParams, GetLatestSignedFeedsParams, GetLiquidationHistoryParams, GetMarginParams, GetStatisticsParams, Metrics } from './types.js';
export declare class DeriveApiError extends Error {
    readonly status: number;
    readonly statusText: string;
    readonly body?: string | undefined;
    constructor(status: number, statusText: string, body?: string | undefined);
}
export declare class DeriveClient {
    private readonly baseUrl;
    private readonly timeout;
    private readonly metrics;
    private readonly startTime;
    constructor(config?: DeriveClientConfig);
    getMetrics(): Metrics;
    private recordError;
    private post;
    getAllCurrencies(): Promise<unknown>;
    getCurrency(params: GetCurrencyParams): Promise<unknown>;
    getAllInstruments(params: GetAllInstrumentsParams): Promise<unknown>;
    getInstrument(params: GetInstrumentParams): Promise<unknown>;
    getTicker(params: GetTickerParams): Promise<unknown>;
    getTickers(params: GetTickersParams): Promise<unknown>;
    getSpotFeedHistory(params: GetSpotFeedHistoryParams): Promise<unknown>;
    getSpotFeedHistoryCandles(params: GetSpotFeedHistoryCandlesParams): Promise<unknown>;
    getFundingRateHistory(params: GetFundingRateHistoryParams): Promise<unknown>;
    getInterestRateHistory(params: GetInterestRateHistoryParams): Promise<unknown>;
    getOptionSettlementHistory(params: GetOptionSettlementHistoryParams): Promise<unknown>;
    getLatestSignedFeeds(params: GetLatestSignedFeedsParams): Promise<unknown>;
    getLiquidationHistory(params: GetLiquidationHistoryParams): Promise<unknown>;
    getMargin(params: GetMarginParams): Promise<unknown>;
    getStatistics(params: GetStatisticsParams): Promise<unknown>;
}
