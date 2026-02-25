import { requireNativeModule } from 'expo';

declare class WidgetDataModuleType {
  setTasksJSON(json: string): Promise<void>;
  setTaskCount(count: number): Promise<void>;
}

let WidgetData: WidgetDataModuleType | null = null;
try {
  WidgetData = requireNativeModule<WidgetDataModuleType>('WidgetData');
} catch {
  // Native module not available (Expo Dev Client / simulator without native build)
}

export default WidgetData;
