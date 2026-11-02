import DailyPlanner from "./DailyPlanner";
import useDailyPlanner from "../hooks/useDailyPlanner";

export default function TodoList() {
  return <DailyPlanner {...useDailyPlanner()} />;
}
