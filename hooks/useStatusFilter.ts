import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export type StatusFilter = "all" | "in_progress" | "completed";

export function useStatusFilter(key: string = "taskapp.statusFilter") {
    const [filter, setFilterState] = useState<StatusFilter>("all");

    useEffect(() => {
        let mounted = true;
        AsyncStorage.getItem(key).then(val => {
            if (mounted && val && (val === "all" || val === "in_progress" || val === "completed")) {
                setFilterState(val as StatusFilter);
            }
        }).catch(() => null);
        return () => { mounted = false; };
    }, [key]);

    const setFilter = (newFilter: StatusFilter) => {
        setFilterState(newFilter);
        AsyncStorage.setItem(key, newFilter).catch(() => null);
    };

    return [filter, setFilter] as const;
}
