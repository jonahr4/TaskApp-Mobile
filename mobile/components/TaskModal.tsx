import { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Switch,
    Dimensions,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { createTaskUnified, updateTaskUnified, deleteTaskUnified } from "@/lib/crud";
import { Colors, Spacing, Radius, FontSize } from "@/lib/theme";
import { QUADRANT_META } from "@/lib/types";
import type { Task, TaskGroup, Quadrant } from "@/lib/types";

const { width: SCREEN_W } = Dimensions.get("window");

type Props = {
    visible: boolean;
    onClose: () => void;
    task?: Task | null;
    defaultGroupId?: string | null;
    defaultUrgent?: boolean;
    defaultImportant?: boolean;
    groups: TaskGroup[];
};

const priorityOptions: { key: Quadrant; label: string }[] = [
    { key: "DO", label: "Do First" },
    { key: "SCHEDULE", label: "Schedule" },
    { key: "DELEGATE", label: "Delegate" },
    { key: "DELETE", label: "Eliminate" },
];

/* ── helpers ─────────────────────────────── */

function parseDateStr(s: string | null): Date | null {
    if (!s) return null;
    const d = new Date(s + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
}
function parseTimeStr(s: string | null): Date | null {
    if (!s) return null;
    const [h, m] = s.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
}
function formatDate(d: Date): string {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${day}`;
}
function formatTime(d: Date): string {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function displayDate(s: string | null): string {
    if (!s) return "";
    const d = parseDateStr(s);
    if (!d) return s;
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function displayTime(s: string | null): string {
    if (!s) return "";
    const d = parseTimeStr(s);
    if (!d) return s;
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/* ── component ───────────────────────────── */

export default function TaskModal({
    visible,
    onClose,
    task,
    defaultGroupId,
    defaultUrgent,
    defaultImportant,
    groups,
}: Props) {
    const { user } = useAuth();
    const isEdit = !!task;

    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");
    const [dueDate, setDueDate] = useState<string | null>(null);
    const [dueTime, setDueTime] = useState<string | null>(null);
    const [urgent, setUrgent] = useState<boolean | null>(null);
    const [important, setImportant] = useState<boolean | null>(null);
    const [groupId, setGroupId] = useState<string | null>(null);
    const [completed, setCompleted] = useState(false);
    const [autoUrgentEnabled, setAutoUrgentEnabled] = useState(false);
    const [autoUrgentDays, setAutoUrgentDays] = useState(1);
    const [location, setLocation] = useState("");
    const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [saving, setSaving] = useState(false);

    // Picker visibility
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);

    useEffect(() => {
        if (visible) {
            if (task) {
                setTitle(task.title);
                setNotes(task.notes || "");
                setDueDate(task.dueDate || null);
                setDueTime(task.dueTime || null);
                setUrgent(task.urgent);
                setImportant(task.important);
                setGroupId(task.groupId);
                setCompleted(task.completed);
                setAutoUrgentEnabled(task.autoUrgentDays !== null && task.autoUrgentDays > 0);
                setAutoUrgentDays(task.autoUrgentDays ?? 1);
                setLocation(task.location || "");
            } else {
                setTitle("");
                setNotes("");
                setDueDate(null);
                setDueTime(null);
                setUrgent(defaultUrgent ?? null);
                setImportant(defaultImportant ?? null);
                setGroupId(defaultGroupId ?? groups[0]?.id ?? null);
                setCompleted(false);
                setAutoUrgentEnabled(false);
                setAutoUrgentDays(1);
                setLocation("");
                setLocationCoords(null);
            }
            setShowDatePicker(false);
            setShowTimePicker(false);
            setShowMapPicker(false);
        }
    }, [visible, task, defaultGroupId, defaultUrgent, defaultImportant]);

    const selectedPriority = (() => {
        if (urgent === null || important === null) return null;
        if (urgent && important) return "DO";
        if (!urgent && important) return "SCHEDULE";
        if (urgent && !important) return "DELEGATE";
        return "DELETE";
    })();

    const selectPriority = (key: Quadrant) => {
        if (selectedPriority === key) {
            setUrgent(null);
            setImportant(null);
        } else {
            const meta = QUADRANT_META[key];
            setUrgent(meta.urgent);
            setImportant(meta.important);
        }
    };

    const onDateChange = (_e: DateTimePickerEvent, date?: Date) => {
        if (date) setDueDate(formatDate(date));
    };
    const onTimeChange = (_e: DateTimePickerEvent, date?: Date) => {
        if (date) setDueTime(formatTime(date));
    };

    const handleSave = async () => {
        if (!title.trim()) return;
        setSaving(true);
        try {
            const data = {
                title: title.trim(),
                notes: notes.trim() || undefined,
                urgent,
                important,
                dueDate: dueDate || null,
                dueTime: dueTime || null,
                groupId,
                completed,
                order: task?.order ?? Date.now(),
                autoUrgentDays: autoUrgentEnabled ? autoUrgentDays : null,
                reminder: task?.reminder ?? false,
                location: location.trim() || null,
            };
            if (isEdit && task) {
                await updateTaskUnified(user?.uid, task.id, data);
            } else {
                await createTaskUnified(user?.uid, data as any);
            }
            onClose();
        } catch {
            Alert.alert("Error", "Failed to save task.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!task) return;
        Alert.alert("Delete Task", `Delete "${task.title}"?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    await deleteTaskUnified(user?.uid, task.id);
                    onClose();
                },
            },
        ]);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.headerSideBtn}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{isEdit ? "Edit Task" : "New Task"}</Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={saving || !title.trim()}
                        style={[styles.headerSideBtn, { alignItems: "flex-end" as const }]}
                    >
                        <Text
                            style={[
                                styles.saveText,
                                (!title.trim() || saving) && styles.saveTextDisabled,
                            ]}
                        >
                            {saving ? "Saving..." : "Save"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    style={styles.body}
                    contentContainerStyle={{ paddingBottom: 60 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Title + completed toggle */}
                    <View style={styles.titleRow}>
                        <TextInput
                            style={styles.titleInput}
                            placeholder="Task title"
                            placeholderTextColor={Colors.light.textTertiary}
                            value={title}
                            onChangeText={setTitle}
                            autoFocus={!isEdit}
                            multiline
                        />
                        <TouchableOpacity
                            onPress={() => setCompleted(!completed)}
                            style={styles.completedBtn}
                        >
                            <Ionicons
                                name={completed ? "checkmark-circle" : "ellipse-outline"}
                                size={28}
                                color={completed ? "#22c55e" : Colors.light.borderLight}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Notes */}
                    <TextInput
                        style={styles.notesInput}
                        placeholder="Notes (optional)"
                        placeholderTextColor={Colors.light.textTertiary}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={3}
                    />

                    {/* Due Date */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Due Date</Text>
                        <TouchableOpacity
                            style={styles.fieldRow}
                            onPress={() => {
                                if (!dueDate) setDueDate(formatDate(new Date()));
                                setShowDatePicker(!showDatePicker);
                                setShowTimePicker(false);
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="calendar-outline" size={20} color={Colors.light.accent} />
                            <Text style={[styles.fieldText, !dueDate && styles.fieldPlaceholder]}>
                                {dueDate ? displayDate(dueDate) : "Add due date"}
                            </Text>
                            {dueDate && (
                                <TouchableOpacity
                                    onPress={() => { setDueDate(null); setShowDatePicker(false); }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="close-circle" size={18} color={Colors.light.textTertiary} />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={parseDateStr(dueDate) ?? new Date()}
                                mode="date"
                                display="inline"
                                onChange={onDateChange}
                                style={styles.picker}
                            />
                        )}
                    </View>

                    {/* Due Time */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Due Time</Text>
                        <TouchableOpacity
                            style={styles.fieldRow}
                            onPress={() => {
                                if (!dueTime) setDueTime(formatTime(new Date()));
                                setShowTimePicker(!showTimePicker);
                                setShowDatePicker(false);
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="time-outline" size={20} color={Colors.light.accent} />
                            <Text style={[styles.fieldText, !dueTime && styles.fieldPlaceholder]}>
                                {dueTime ? displayTime(dueTime) : "Add due time"}
                            </Text>
                            {dueTime && (
                                <TouchableOpacity
                                    onPress={() => { setDueTime(null); setShowTimePicker(false); }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="close-circle" size={18} color={Colors.light.textTertiary} />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                        {showTimePicker && (
                            <DateTimePicker
                                value={parseTimeStr(dueTime) ?? new Date()}
                                mode="time"
                                display="spinner"
                                onChange={onTimeChange}
                                style={styles.picker}
                            />
                        )}
                    </View>

                    {/* Priority */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Priority</Text>
                        <View style={styles.priorityGrid}>
                            {priorityOptions.map((opt) => {
                                const meta = QUADRANT_META[opt.key];
                                const isSelected = selectedPriority === opt.key;
                                return (
                                    <TouchableOpacity
                                        key={opt.key}
                                        style={[
                                            styles.priorityBtn,
                                            {
                                                borderColor: isSelected ? meta.color : Colors.light.borderLight,
                                                backgroundColor: isSelected ? meta.bg : Colors.light.bgCard,
                                            },
                                        ]}
                                        onPress={() => selectPriority(opt.key)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.priBtnDot, { backgroundColor: meta.color }]} />
                                        <Text
                                            style={[
                                                styles.priBtnText,
                                                { color: isSelected ? meta.color : Colors.light.textSecondary },
                                            ]}
                                        >
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Auto-Urgent (below Priority) */}
                    <View style={styles.section}>
                        <View style={styles.toggleRow}>
                            <View style={styles.toggleLeft}>
                                <Ionicons name="alert-circle-outline" size={20} color="#f59e0b" />
                                <View>
                                    <Text style={styles.toggleLabel}>Auto-urgent</Text>
                                    <Text style={styles.toggleSub}>
                                        {autoUrgentEnabled
                                            ? `Mark urgent ${autoUrgentDays} day${autoUrgentDays > 1 ? "s" : ""} before due`
                                            : "Off"}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={autoUrgentEnabled}
                                onValueChange={setAutoUrgentEnabled}
                                trackColor={{ false: Colors.light.borderLight, true: "#fbbf24" }}
                                thumbColor="#fff"
                            />
                        </View>
                        {autoUrgentEnabled && (
                            <View style={styles.daysRow}>
                                <Text style={styles.daysLabel}>Days before due date:</Text>
                                <View style={styles.daysStepper}>
                                    <TouchableOpacity
                                        onPress={() => setAutoUrgentDays(Math.max(1, autoUrgentDays - 1))}
                                        style={styles.stepperBtn}
                                    >
                                        <Ionicons name="remove" size={16} color={Colors.light.textPrimary} />
                                    </TouchableOpacity>
                                    <Text style={styles.daysValue}>{autoUrgentDays}</Text>
                                    <TouchableOpacity
                                        onPress={() => setAutoUrgentDays(Math.min(30, autoUrgentDays + 1))}
                                        style={styles.stepperBtn}
                                    >
                                        <Ionicons name="add" size={16} color={Colors.light.textPrimary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Group */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>List</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.groupChips}>
                                {groups.map((g) => (
                                    <TouchableOpacity
                                        key={g.id}
                                        style={[
                                            styles.groupChip,
                                            groupId === g.id && {
                                                backgroundColor: g.color ? `${g.color}15` : Colors.light.accentLight,
                                                borderColor: g.color || Colors.light.accent,
                                            },
                                        ]}
                                        onPress={() => setGroupId(g.id)}
                                    >
                                        <View
                                            style={[
                                                styles.chipDot,
                                                { backgroundColor: g.color || Colors.light.textTertiary },
                                            ]}
                                        />
                                        <Text
                                            style={[
                                                styles.chipText,
                                                groupId === g.id && { color: Colors.light.textPrimary },
                                            ]}
                                        >
                                            {g.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Location (very bottom) */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Location</Text>
                        <TouchableOpacity
                            style={styles.fieldRow}
                            onPress={() => setShowMapPicker(true)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="location-outline" size={20} color={Colors.light.accent} />
                            <Text style={[styles.fieldText, !location && styles.fieldPlaceholder]}>
                                {location || "Add location"}
                            </Text>
                            {location.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => { setLocation(""); setLocationCoords(null); }}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Ionicons name="close-circle" size={18} color={Colors.light.textTertiary} />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                        {/* Mini map preview */}
                        {locationCoords && (
                            <View style={styles.mapPreview}>
                                <MapView
                                    style={styles.miniMap}
                                    region={{
                                        latitude: locationCoords.lat,
                                        longitude: locationCoords.lng,
                                        latitudeDelta: 0.01,
                                        longitudeDelta: 0.01,
                                    }}
                                    scrollEnabled={false}
                                    zoomEnabled={false}
                                    pitchEnabled={false}
                                    rotateEnabled={false}
                                >
                                    <Marker
                                        coordinate={{
                                            latitude: locationCoords.lat,
                                            longitude: locationCoords.lng,
                                        }}
                                    />
                                </MapView>
                            </View>
                        )}
                    </View>

                    {/* Delete */}
                    {isEdit && (
                        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                            <Ionicons name="trash-outline" size={18} color={Colors.light.danger} />
                            <Text style={styles.deleteText}>Delete Task</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ── Map Picker Modal ──────────────── */}
            <MapPickerModal
                visible={showMapPicker}
                onClose={() => setShowMapPicker(false)}
                onSelect={(name, coords) => {
                    setLocation(name);
                    setLocationCoords(coords);
                    setShowMapPicker(false);
                }}
                initialCoords={locationCoords}
            />
        </Modal>
    );
}

/* ── Map Picker Subcomponent ────────────── */

function MapPickerModal({
    visible,
    onClose,
    onSelect,
    initialCoords,
}: {
    visible: boolean;
    onClose: () => void;
    onSelect: (name: string, coords: { lat: number; lng: number }) => void;
    initialCoords: { lat: number; lng: number } | null;
}) {
    const [region, setRegion] = useState<Region>({
        latitude: initialCoords?.lat ?? 37.7749,
        longitude: initialCoords?.lng ?? -122.4194,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
    });
    const [pin, setPin] = useState<{ lat: number; lng: number } | null>(initialCoords);
    const [searchText, setSearchText] = useState("");
    const [resolvedName, setResolvedName] = useState("");
    const mapRef = useRef<MapView>(null);

    useEffect(() => {
        if (visible && !initialCoords) {
            // Try to get user's current location
            (async () => {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === "granted") {
                    const loc = await Location.getCurrentPositionAsync({});
                    const r = {
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                    };
                    setRegion(r);
                }
            })();
        }
        if (visible && initialCoords) {
            setPin(initialCoords);
            setRegion({
                latitude: initialCoords.lat,
                longitude: initialCoords.lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            });
        }
    }, [visible]);

    const handleMapPress = async (e: any) => {
        const coord = e.nativeEvent.coordinate;
        const p = { lat: coord.latitude, lng: coord.longitude };
        setPin(p);
        // Reverse-geocode
        try {
            const results = await Location.reverseGeocodeAsync({
                latitude: coord.latitude,
                longitude: coord.longitude,
            });
            if (results.length > 0) {
                const r = results[0];
                const parts = [r.name, r.street, r.city, r.region].filter(Boolean);
                setResolvedName(parts.join(", "));
            } else {
                setResolvedName(`${coord.latitude.toFixed(4)}, ${coord.longitude.toFixed(4)}`);
            }
        } catch {
            setResolvedName(`${coord.latitude.toFixed(4)}, ${coord.longitude.toFixed(4)}`);
        }
    };

    const handleSearch = async () => {
        if (!searchText.trim()) return;
        try {
            const results = await Location.geocodeAsync(searchText.trim());
            if (results.length > 0) {
                const { latitude, longitude } = results[0];
                const p = { lat: latitude, lng: longitude };
                setPin(p);
                setResolvedName(searchText.trim());
                const r = { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
                setRegion(r);
                mapRef.current?.animateToRegion(r, 500);
            } else {
                Alert.alert("Not Found", "Couldn't find that location.");
            }
        } catch {
            Alert.alert("Error", "Couldn't search for location.");
        }
    };

    const handleConfirm = () => {
        if (!pin) return;
        onSelect(resolvedName || searchText || "Pinned Location", pin);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={mapStyles.container}>
                {/* Header */}
                <View style={mapStyles.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={mapStyles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={mapStyles.headerTitle}>Choose Location</Text>
                    <TouchableOpacity onPress={handleConfirm} disabled={!pin}>
                        <Text style={[mapStyles.doneText, !pin && { opacity: 0.4 }]}>
                            Done
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={mapStyles.searchBar}>
                    <Ionicons name="search" size={18} color={Colors.light.textTertiary} />
                    <TextInput
                        style={mapStyles.searchInput}
                        placeholder="Search for a place..."
                        placeholderTextColor={Colors.light.textTertiary}
                        value={searchText}
                        onChangeText={setSearchText}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                </View>

                {/* Map */}
                <MapView
                    ref={mapRef}
                    style={mapStyles.map}
                    region={region}
                    onRegionChangeComplete={setRegion}
                    onPress={handleMapPress}
                    showsUserLocation
                    showsMyLocationButton
                >
                    {pin && (
                        <Marker
                            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
                        />
                    )}
                </MapView>

                {/* Selected location bar */}
                {pin && resolvedName ? (
                    <View style={mapStyles.selectedBar}>
                        <Ionicons name="location" size={18} color={Colors.light.accent} />
                        <Text style={mapStyles.selectedText} numberOfLines={2}>
                            {resolvedName}
                        </Text>
                    </View>
                ) : (
                    <View style={mapStyles.selectedBar}>
                        <Text style={mapStyles.hintText}>Tap the map or search to select a location</Text>
                    </View>
                )}
            </View>
        </Modal>
    );
}

/* ── Styles ──────────────────────────────── */

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.bg,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: Spacing.lg,
        paddingTop: Platform.OS === "ios" ? 20 : Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
        backgroundColor: Colors.light.bgCard,
    },
    headerSideBtn: {
        minWidth: 64,
    },
    cancelText: {
        fontSize: FontSize.md,
        color: Colors.light.textSecondary,
    },
    headerTitle: {
        fontSize: FontSize.lg,
        fontWeight: "600",
        color: Colors.light.textPrimary,
        textAlign: "center",
    },
    saveText: {
        fontSize: FontSize.md,
        fontWeight: "600",
        color: Colors.light.accent,
    },
    saveTextDisabled: {
        opacity: 0.4,
    },
    body: {
        flex: 1,
        padding: Spacing.xl,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: Spacing.sm,
    },
    titleInput: {
        flex: 1,
        fontSize: FontSize.xl,
        fontWeight: "600",
        color: Colors.light.textPrimary,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
        minHeight: 48,
    },
    completedBtn: {
        paddingTop: Spacing.md,
    },
    notesInput: {
        fontSize: FontSize.md,
        color: Colors.light.textPrimary,
        paddingVertical: Spacing.md,
        marginTop: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
        minHeight: 60,
        textAlignVertical: "top",
    },
    section: {
        marginTop: Spacing.xxl,
    },
    sectionLabel: {
        fontSize: FontSize.sm,
        fontWeight: "600",
        color: Colors.light.textSecondary,
        marginBottom: Spacing.sm,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    fieldRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        backgroundColor: Colors.light.bgCard,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: 14,
    },
    fieldText: {
        flex: 1,
        fontSize: FontSize.md,
        color: Colors.light.textPrimary,
    },
    fieldPlaceholder: {
        color: Colors.light.textTertiary,
    },
    picker: {
        marginTop: Spacing.sm,
    },
    toggleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: Colors.light.bgCard,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: 12,
    },
    toggleLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        flex: 1,
    },
    toggleLabel: {
        fontSize: FontSize.md,
        fontWeight: "500",
        color: Colors.light.textPrimary,
    },
    toggleSub: {
        fontSize: FontSize.xs,
        color: Colors.light.textTertiary,
        marginTop: 1,
    },
    daysRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: Spacing.sm,
        paddingHorizontal: Spacing.sm,
    },
    daysLabel: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
    },
    daysStepper: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        backgroundColor: Colors.light.bgCard,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
    },
    stepperBtn: {
        padding: 4,
    },
    daysValue: {
        fontSize: FontSize.md,
        fontWeight: "600",
        color: Colors.light.textPrimary,
        minWidth: 24,
        textAlign: "center",
    },
    priorityGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.sm,
    },
    priorityBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        borderRadius: Radius.md,
        borderWidth: 1.5,
        minWidth: "45%",
        flex: 1,
    },
    priBtnDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    priBtnText: {
        fontSize: FontSize.sm,
        fontWeight: "600",
    },
    groupChips: {
        flexDirection: "row",
        gap: Spacing.sm,
    },
    groupChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        borderRadius: Radius.full,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
        backgroundColor: Colors.light.bgCard,
    },
    chipDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    chipText: {
        fontSize: FontSize.sm,
        color: Colors.light.textSecondary,
        fontWeight: "500",
    },
    mapPreview: {
        marginTop: Spacing.sm,
        borderRadius: Radius.md,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
    },
    miniMap: {
        height: 140,
        width: "100%",
    },
    deleteBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        marginTop: Spacing.xxxl,
        paddingVertical: Spacing.lg,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: "#fecaca",
        backgroundColor: "#fef2f2",
    },
    deleteText: {
        fontSize: FontSize.md,
        fontWeight: "500",
        color: Colors.light.danger,
    },
});

const mapStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.bg,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: Spacing.lg,
        paddingTop: Platform.OS === "ios" ? 20 : Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
        backgroundColor: Colors.light.bgCard,
    },
    cancelText: {
        fontSize: FontSize.md,
        color: Colors.light.textSecondary,
    },
    headerTitle: {
        fontSize: FontSize.lg,
        fontWeight: "600",
        color: Colors.light.textPrimary,
    },
    doneText: {
        fontSize: FontSize.md,
        fontWeight: "600",
        color: Colors.light.accent,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        margin: Spacing.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        backgroundColor: Colors.light.bgCard,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.light.borderLight,
    },
    searchInput: {
        flex: 1,
        fontSize: FontSize.md,
        color: Colors.light.textPrimary,
        padding: 0,
    },
    map: {
        flex: 1,
    },
    selectedBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.light.bgCard,
        borderTopWidth: 1,
        borderTopColor: Colors.light.borderLight,
        minHeight: 56,
    },
    selectedText: {
        flex: 1,
        fontSize: FontSize.md,
        color: Colors.light.textPrimary,
    },
    hintText: {
        fontSize: FontSize.sm,
        color: Colors.light.textTertiary,
        textAlign: "center",
        flex: 1,
    },
});
