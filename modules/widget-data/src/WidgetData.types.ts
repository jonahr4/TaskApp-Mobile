/** Simplified task shape written to shared UserDefaults for widgets. */
export type WidgetTask = {
  id: string;
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  completed: boolean;
  urgent: boolean | null;
  important: boolean | null;
  groupColor: string | null;
};
