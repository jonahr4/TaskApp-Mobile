import { NativeModule, requireNativeModule } from 'expo';

declare class WidgetDataModule extends NativeModule {
  setTasksJSON(json: string): Promise<void>;
  setTaskCount(count: number): Promise<void>;
}

export default requireNativeModule<WidgetDataModule>('WidgetData');
