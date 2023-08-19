import { IngestionAdapterService } from "../ingestion-adapter/ingestion-adapter.service";

export interface MetaModuleOptions {
  ingestionAdapter: IngestionAdapterService;
  natsServers: string[];
}
