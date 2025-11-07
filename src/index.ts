// Export n8n node (required for n8n to load it)
export { FAIMForecast } from './nodes/FAIMForecast/FAIMForecast.node';
// Note: Credentials class is also named FAIMForecast (for n8n auto-discovery)
// but it's a credential type, not a node type
export { FAIMForecast as FAIMForecastCredentials } from './nodes/FAIMForecast/FAIMForecast.credentials';

// Export public API
export { ForecastClient, ClientConfig, ForecastResponse } from './api/forecastClient';
export { RequestBuilder, ForecastRequest, BuiltRequest, ModelType, OutputType } from './api/requestBuilder';
export { ShapeConverter, NormalizedData } from './data/shapeConverter';
export { ArrowSerializer, ArrowData } from './arrow/serializer';
export {
  FaimError,
  ValidationError,
  PayloadTooLargeError,
  ModelNotFoundError,
  TimeoutError,
  ResourceExhaustedError,
  InferenceError,
  NetworkError,
  SerializationError,
  ApiError,
} from './errors/customErrors';
export { ErrorHandler, ErrorResponse } from './errors/errorHandler';