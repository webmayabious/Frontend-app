import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    Platform,
    Dimensions,
    StatusBar,
    DeviceEventEmitter,
    Keyboard,
    Animated,
    Easing,
    Modal,
    ActivityIndicator,
    useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Icon1 from 'react-native-vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = size => (SCREEN_WIDTH / 375) * size;
const verticalScale = size => (SCREEN_HEIGHT / 812) * size;
const WIDE_BREAKPOINT = 768;

const KB_SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const KB_HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

// ─── API ─────────────────────────────────────────────────────────────────────
const BASE_URL = 'https://api.mokhsh.info/api/pm';

// same key your axios interceptor reads
const TOKEN_KEY = 'PM_TOKEN';

// local cache (AsyncStorage)
const DRAFT_KEY = 'PM_CREATE_PROJECT_DRAFT';          // unfinished setup, auto-saved while typing
const LAST_SUBMIT_KEY = 'PM_LAST_SUBMITTED_PROJECT';  // everything from the last completed submit
const getToken = async () => AsyncStorage.getItem(TOKEN_KEY);

const ENDPOINTS = {
    projects: 'getAllPropertyProjectsActiveInactive', // paginated (50 per page)
    projectTypes: 'getAllPropertyProjectType',
    categories: 'getAllPropertyProjectCategoryType',
    locations: 'getAllPropertyLocationActiveInactive',
    configurations: 'getAllPropertyConfiguration',
    unitTypes: 'getAllPropertyUnitType',
    plcMaster: 'getAllPropertyPLCmaster',
    floorsByPhaseBlock: 'getAllPropertyFloorByPhaseBlockId', // /{phaseId}/{blockId}
    phasesByProject: 'getAllPropertyPhaseByProId',           // /{projectId}  (edit mode)
    createTimeline: 'createPropertyProjectTimeLine',
};

async function request(path, method = 'GET', body) {
    const token = await getToken();
    const res = await fetch(`${BASE_URL}/${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null);
    // some endpoints return { success }, others { status }
    if (!res.ok || !json || json.success === false || json.status === false) {
        throw new Error(apiErrorText(json, res.status));
    }
    return json;
}

// show only the error text the API sent (`error` first, then `message`)
const apiErrorText = (json, status) => {
    if (!json) return `Request failed (${status})`;
    const e = json.error ?? json.errors;
    if (typeof e === 'string' && e) return e;
    if (Array.isArray(e) && e.length) return e.map(d => (typeof d === 'string' ? d : d?.message || JSON.stringify(d))).join('\n');
    if (e && typeof e === 'object') return Object.values(e).flat().join('\n');
    return json.message || `Request failed (${status})`;
};

// master rows -> [{id, name}] (active only)
const pickName = r =>
    r.name ?? r.project_name ?? r.property_project_type_name ?? r.property_project_category_type_name ??
    r.status_name ?? r.configuration_name ?? r.unit_type_name ?? r.plc_name ?? String(r.id);
// some masters hold the same name twice (e.g. "Commercial" ids 2 and 7):
// keep one per name (the newest id) so the dropdown has no duplicates
const toOpts = list => {
    const byName = new Map();
    (list || [])
        .filter(r => r.active === undefined || String(r.active) === '1')
        .forEach(r => {
            const name = pickName(r);
            const prev = byName.get(name.toLowerCase());
            if (!prev || r.id > prev.id) byName.set(name.toLowerCase(), { id: r.id, name });
        });
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
};

// the list is paginated (50 per page): read page 1, then the remaining pages in parallel
const fetchAllProjects = async () => {
    const first = await request(`${ENDPOINTS.projects}?page=1`);
    let rows = first.data || [];
    const totalPages = first.pagination?.totalPages || 1;
    if (totalPages > 1) {
        const rest = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) => request(`${ENDPOINTS.projects}?page=${i + 2}`)),
        );
        rest.forEach(r => {
            rows = rows.concat(r.data || []);
        });
    }
    // only active projects are shown; several share a name, so the city is added to tell them apart
    return rows
        .filter(r => String(r.active) === '1')
        .map(r => {
            const used = String(r.details_added) === '1';
            return {
                id: r.id,
                name: r.propertylocation?.name ? `${r.project_name} - ${r.propertylocation.name}` : r.project_name,
                used,
                tag: used ? 'Already used' : 'Available',
                tagColor: used ? COLORS.orange : COLORS.green,
            };
        })
        // Available first, then Already used; A-Z inside each group
        .sort((a, b) => Number(a.used) - Number(b.used) || a.name.localeCompare(b.name));
};

// ─── COLORS ──────────────────────────────────────────────────────────────────
const COLORS = {
    accent: '#00cfff',
    white: '#FFFFFF',
    mutedText: '#8A90B4',
    gold: '#f4c542',
    red: '#FF6B6B',
    green: '#00C48C',
    orange: '#FFB85D',
    cardBg: '#ffffff0e',
    modalBg: '#21283a',
    fieldBg: '#2b3348',
    fieldBorder: '#39415a',
    blue: '#1e9ce8',
};

const STEPS = [
    { title: 'Project Details', icon: 'info' },
    { title: 'Location', icon: 'location-on' },
    { title: 'Unit Configuration', icon: 'domain' },
    { title: 'Pricing', icon: 'attach-money' },
    { title: 'Timeline', icon: 'event' },
];

// Construction status ids -> labels. Keep identical to STATUS_BY_ID in the Projects list screen
// (5 is a placeholder there too).
const STATUS_BY_ID = {
    1: 'Pre-launch',
    2: 'New-launch',
    3: 'Under Construction',
    4: 'Ready to Move',
    5: 'Completed',
};
const STATUS_OPTS = Object.entries(STATUS_BY_ID).map(([id, name]) => ({ id: Number(id), name }));

// countries (value is what the form stores, label is what the API receives)
const COUNTRIES = [
    { label: 'India', value: 'india' },
    { label: 'United Arab Emirates', value: 'uae' },
    { label: 'Singapore', value: 'singapore' },
    { label: 'United Kingdom', value: 'uk' },
    { label: 'United States', value: 'usa' },
];
// DropdownField wants { id, name }
const COUNTRY_OPTS = COUNTRIES.map(c => ({ id: c.value, name: c.label }));
const countryName = v => COUNTRIES.find(c => c.value === v)?.label ?? v;

// static lists (no API for these). The floor list now comes from the API.
const OPT = {
    state: ['West Bengal', 'Telangana', 'Maharashtra', 'Delhi', 'Andaman and Nicobar Islands'],
    escalation: ['Without Range', 'With Range'],
};

// `id` on a row = already saved on the server and locked (create mode)
// `recordId` on a row = saved on the server and still editable (edit mode)
const emptyPhase = { name: '', id: null };
const emptyTower = { tower: '', floors: '', units: '', parking: '', id: null };
const emptyConfig = { configuration: '', unitType: '', floor: '', unitName: '', saleable: '', carpet: '', balcony: '', id: null };
const emptyPrice = { price: '', date: '', id: null };
const emptyEsc = { from: '', to: '', rate: '', id: null };
const emptyPlc = { plc: '', unitId: '', amount: '', id: null };

// blank form (create mode)
const makeForm = projectId => ({
    project: projectId ?? '', rera: '', projectType: '', category: '', status: '', overview: '',
    address: '', locality: '', landmark: '', city: '', cityText: '', state: '', pin: '', country: 'india', mapLink: '',
    phases: [{ ...emptyPhase }],
    towers: [{ ...emptyTower }],
    configs: [{ ...emptyConfig }],
    glancePhase: '', configTower: '',
    pricePhase: '', priceTower: '', booking: '',
    prices: [{ ...emptyPrice }],
    escMode: 'Without Range',
    escalations: [{ ...emptyEsc }],
    plcs: [{ ...emptyPlc }],
    launch: '', possession: '',
});

// form filled from a project row of the Projects list (edit mode)
const buildEditForm = item => {
    const loc = (item.locations || [])[0] || {};
    const t = (item.timelines || [])[0] || {};
    const country =
        COUNTRIES.find(c => c.label.toLowerCase() === String(loc.country || 'India').toLowerCase())?.value || 'india';
    return {
        ...makeForm(item.projectId ?? item.project_id ?? item.pro_id),
        rera: item.rera ?? item.rera_registration_number ?? '',
        projectType: item.typeId ?? item.project_type_id ?? '',
        category: item.categoryId ?? item.project_category_id ?? '',
        status: (item.statusId ?? item.construction_status) ? Number(item.statusId ?? item.construction_status) : '',
        overview: item.overview ?? item.project_overview ?? '',
        address: loc.site_address || '',
        locality: loc.neighbourhood_details || '',
        landmark: loc.nearby_landmark || '',
        country,
        state: loc.state || '',
        city: country === 'india' ? loc.location_id ?? loc.propertylocation?.id ?? '' : '',
        cityText: country === 'india' ? '' : loc.city_name || loc.propertylocation?.name || '',
        pin: loc.pin_code || '',
        mapLink: loc.map_location_link || '',
        phases: [{ ...emptyPhase }], // loaded from the server by loadPhases() (getAllPropertyPhaseByProId)
        launch: String(t.project_launch_date || '').slice(0, 10),
        possession: String(t.expected_possession_date || '').slice(0, 10),
    };
};

// signatures: in edit mode a step is only sent again when something changed
const detailsSig = f => JSON.stringify([f.rera, f.projectType, f.category, f.status, f.overview]);
const locationSig = f =>
    JSON.stringify([f.country, f.state, f.city, f.cityText, f.address, f.locality, f.landmark, f.pin, f.mapLink]);

const formatDate = d => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
};

const useWide = () => useWindowDimensions().width >= WIDE_BREAKPOINT;

// ─── APP MODAL (replaces Alert.alert) ────────────────────────────────────────
// config: { type, title, message, buttons: [{ text, style: 'cancel'|'destructive'|undefined, onPress }] }
const MODAL_TYPES = {
    error: { icon: 'error-outline', color: COLORS.red },
    success: { icon: 'check-circle', color: COLORS.green },
    warning: { icon: 'warning', color: COLORS.orange },
    info: { icon: 'info-outline', color: COLORS.accent },
    confirm: { icon: 'help-outline', color: COLORS.blue },
};

const AppModal = ({ config, onClose }) => {
    const lastConfig = useRef(config);
    if (config) lastConfig.current = config;
    const c = config || lastConfig.current;

    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (config) {
            anim.setValue(0);
            Animated.spring(anim, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }).start();
        }
    }, [config]);

    if (!c) return null;
    const t = MODAL_TYPES[c.type] || MODAL_TYPES.info;
    const buttons = c.buttons && c.buttons.length ? c.buttons : [{ text: 'OK' }];
    const stacked = buttons.length > 2;

    const press = b => {
        onClose();
        b.onPress && b.onPress();
    };
    // Android back button: act like the cancel button if there is one
    const onRequestClose = () => {
        const cancel = buttons.find(b => b.style === 'cancel');
        if (cancel) press(cancel);
        else if (buttons.length === 1) press(buttons[0]);
    };

    return (
        <Modal visible={!!config} transparent animationType="fade" statusBarTranslucent onRequestClose={onRequestClose}>
            <View style={styles.mdBackdrop}>
                <Animated.View
                    style={[
                        styles.mdCard,
                        {
                            opacity: anim,
                            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
                        },
                    ]}
                >
                    <View style={[styles.mdAccentBar, { backgroundColor: t.color }]} />
                    <View style={[styles.mdIconWrap, { backgroundColor: t.color + '1F', borderColor: t.color + '66' }]}>
                        <Icon name={t.icon} size={30} color={t.color} />
                    </View>
                    <Text style={styles.mdTitle}>{c.title}</Text>
                    {c.message ? <Text style={styles.mdMessage}>{c.message}</Text> : null}

                    <View style={[styles.mdBtnRow, stacked && { flexDirection: 'column' }]}>
                        {buttons.map((b, i) => {
                            const destructive = b.style === 'destructive';
                            const cancel = b.style === 'cancel';
                            const primary = !destructive && !cancel;
                            return (
                                <TouchableOpacity
                                    key={`${b.text}${i}`}
                                    activeOpacity={0.85}
                                    onPress={() => press(b)}
                                    style={[
                                        styles.mdBtn,
                                        !stacked && { flex: 1 },
                                        cancel && styles.mdBtnCancel,
                                        destructive && styles.mdBtnDanger,
                                        primary && { backgroundColor: t.color === COLORS.red ? COLORS.blue : t.color },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.mdBtnText,
                                            cancel && { color: '#c3cbdb' },
                                            destructive && { color: COLORS.red },
                                        ]}
                                    >
                                        {b.text}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

// ─── FORM PREVIEW ────────────────────────────────────────────────────────────
// data: { sections: [{ step, title, icon, rows: [{ label, value, required, saved, note }] }], reqTotal, reqFilled, missing }
const PreviewModal = ({ visible, data, onClose, onGoStep }) => {
    const insets = useSafeAreaInsets();
    if (!data) return null;
    const { sections, reqTotal, reqFilled, missing } = data;
    const allDone = missing.length === 0;

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
            <View style={styles.pvBackdrop}>
                <View style={[styles.pvSheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                    <View style={styles.pvHeader}>
                        <Icon name="visibility" size={18} color={COLORS.accent} />
                        <Text style={styles.pvHeaderTitle}>Form Preview</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Icon name="close" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 14, paddingBottom: 20 }}>
                        <View style={[styles.pvSummary, { borderColor: allDone ? 'rgba(0,196,140,0.45)' : 'rgba(255,107,107,0.45)' }]}>
                            <Icon name={allDone ? 'check-circle' : 'error-outline'} size={22} color={allDone ? COLORS.green : COLORS.red} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.pvSummaryTitle}>
                                    {allDone ? 'All required fields are filled' : `${reqFilled} of ${reqTotal} required fields filled`}
                                </Text>
                                {!allDone && <Text style={styles.pvSummaryText}>Missing: {missing.join(', ')}</Text>}
                            </View>
                        </View>

                        {sections.map(sec => (
                            <View key={sec.title} style={styles.pvSection}>
                                <View style={styles.pvSectionHead}>
                                    <Icon name={sec.icon} size={14} color={COLORS.accent} />
                                    <Text style={styles.pvSectionTitle}>{sec.title}</Text>
                                    <TouchableOpacity style={styles.pvEditBtn} onPress={() => onGoStep(sec.step)} activeOpacity={0.8}>
                                        <Icon name="edit" size={12} color={COLORS.accent} />
                                        <Text style={styles.pvEditText}>Edit</Text>
                                    </TouchableOpacity>
                                </View>

                                {sec.rows.map((r, i) => {
                                    const empty = !r.value;
                                    const bad = empty && r.required;
                                    return (
                                        <View key={`${r.label}${i}`} style={[styles.pvRow, bad && styles.pvRowMissing]}>
                                            <Icon
                                                name={!empty ? 'check-circle' : bad ? 'error-outline' : 'remove-circle-outline'}
                                                size={16}
                                                color={!empty ? COLORS.green : bad ? COLORS.red : '#6b7690'}
                                                style={{ marginTop: 1 }}
                                            />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.pvLabel}>{r.label}{r.required ? ' *' : ''}</Text>
                                                {empty ? (
                                                    <Text style={[styles.pvEmpty, bad && { color: COLORS.red }]}>Not filled</Text>
                                                ) : (
                                                    <Text style={styles.pvValue}>{r.value}</Text>
                                                )}
                                                {r.note ? <Text style={styles.pvNote}>{r.note}</Text> : null}
                                            </View>
                                            {r.saved ? (
                                                <View style={styles.pvSaved}>
                                                    <Text style={styles.pvSavedText}>Saved</Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                    </ScrollView>

                    <TouchableOpacity style={styles.pvCloseBtn} onPress={onClose} activeOpacity={0.85}>
                        <Text style={styles.buttonText}>Continue editing</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// ─── LAYOUT HELPERS ──────────────────────────────────────────────────────────
const Row = ({ children }) => {
    const wide = useWide();
    return <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 10 : 0 }}>{children}</View>;
};

const FieldWrap = ({ label, hint, children }) => {
    const wide = useWide();
    return (
        <View style={[styles.inputWrapper, wide && { flex: 1 }]}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            {children}
            {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
    );
};

const Section = ({ title, icon, children }) => (
    <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
            <Icon name={icon || 'info'} size={14} color={COLORS.accent} />
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.sectionDivider} />
        {children}
    </View>
);

const TextField = ({ label, value, onChangeText, placeholder, hint, keyboardType, multiline }) => (
    <FieldWrap label={label} hint={hint}>
        <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder || label}
            placeholderTextColor={COLORS.mutedText}
            keyboardType={keyboardType}
            multiline={multiline}
            style={multiline ? styles.textArea : styles.input}
        />
    </FieldWrap>
);

const DateField = ({ label, value, onChange }) => {
    const [show, setShow] = useState(false);
    const parse = s => {
        if (!s) return new Date();
        const [y, m, d] = s.split('-').map(Number);
        const dt = new Date(y, (m || 1) - 1, d || 1);
        return isNaN(dt.getTime()) ? new Date() : dt;
    };

    return (
        <FieldWrap label={label}>
            <TouchableOpacity style={styles.inputWithIcon} onPress={() => setShow(true)} activeOpacity={0.8}>
                <Text style={{ color: value ? '#e6ebf2' : COLORS.mutedText, fontSize: 13 }}>
                    {value || 'yyyy-mm-dd'}
                </Text>
                {value ? (
                    <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Icon name="close" size={18} color="#ff5252" />
                    </TouchableOpacity>
                ) : (
                    <Icon name="calendar-today" size={17} color={COLORS.accent} />
                )}
            </TouchableOpacity>
            {show && (
                <DateTimePicker
                    value={parse(value)}
                    mode="date"
                    display="default"
                    onChange={(event, d) => {
                        setShow(false);
                        if (event?.type === 'dismissed' || !d) return;
                        onChange(formatDate(d));
                    }}
                />
            )}
        </FieldWrap>
    );
};

// ─── INLINE DROPDOWN ─────────────────────────────────────────────────────────
// options: strings OR { id, name }. `value` is the selected id (or the string itself).
// onChange(id, option)
const ITEM_H = 40;
const SEARCH_H = 42;
const MAX_LIST_H = 220;
const LIST_GAP = 4;
const EXTRA_GAP = 16;
const HEADER_H = 42 + 20;

const norm = o => (o !== null && typeof o === 'object' ? o : { id: o, name: String(o) });

const DropdownField = ({
    label,
    options = [],
    value,
    onChange,
    hint,
    placeholder,
    disabled,
    scrollRef,
    scrollYRef,
    kbTopRef,
}) => {
    const insets = useSafeAreaInsets();
    const wide = useWide();

    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [search, setSearch] = useState('');
    const heightAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const triggerRef = useRef(null);
    const justOpened = useRef(false);

    const opts = options.map(norm);
    const filtered = opts.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
    const sameId = (a, b) => a !== '' && a !== null && a !== undefined && String(a) === String(b);
    const selected = opts.find(o => sameId(o.id, value));
    const contentH = filtered.length === 0 ? 48 : filtered.length * ITEM_H;
    const targetH = Math.min(SEARCH_H + contentH, MAX_LIST_H);

    const openRef = useRef(false);
    const targetHRef = useRef(targetH);
    const topInsetRef = useRef(insets.top);
    openRef.current = open;
    targetHRef.current = targetH;
    topInsetRef.current = insets.top;

    const ensureListVisible = kbTop => {
        if (!triggerRef.current || !scrollRef?.current) return;
        triggerRef.current.measureInWindow((x, y, w, h) => {
            const visibleBottom = kbTop || kbTopRef?.current || SCREEN_HEIGHT;
            const listBottom = y + h + LIST_GAP + targetHRef.current + EXTRA_GAP;

            let delta = 0;
            if (listBottom > visibleBottom) delta = listBottom - visibleBottom;

            const minTop = topInsetRef.current + HEADER_H + 24;
            if (y - delta < minTop) delta = y - minTop;

            if (delta > 1) {
                scrollRef.current.scrollTo({
                    y: (scrollYRef?.current || 0) + delta,
                    animated: true,
                });
            }
        });
    };

    useEffect(() => {
        if (!open && !mounted) return;

        Animated.parallel([
            Animated.timing(heightAnim, {
                toValue: open ? targetH : 0,
                duration: open ? 220 : 180,
                easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
                useNativeDriver: false,
            }),
            Animated.timing(fadeAnim, {
                toValue: open ? 1 : 0,
                duration: open ? 220 : 160,
                easing: Easing.out(Easing.quad),
                useNativeDriver: false,
            }),
        ]).start(({ finished }) => {
            if (!finished) return;
            if (open) {
                if (justOpened.current) {
                    justOpened.current = false;
                    ensureListVisible();
                }
            } else {
                setMounted(false);
                setSearch('');
                DeviceEventEmitter.emit('toggleBottomNav', true);
            }
        });
    }, [open, targetH]);

    useEffect(() => {
        const sub = Keyboard.addListener(KB_SHOW, e => {
            if (!openRef.current) return;
            const kbTop = e?.endCoordinates?.screenY;
            setTimeout(() => ensureListVisible(kbTop), Platform.OS === 'ios' ? 60 : 120);
        });
        return () => sub.remove();
    }, []);

    useEffect(() => {
        return () => DeviceEventEmitter.emit('toggleBottomNav', true);
    }, []);

    const toggle = () => {
        if (disabled) return;
        if (open) {
            Keyboard.dismiss();
            setOpen(false);
        } else {
            DeviceEventEmitter.emit('toggleBottomNav', false);
            justOpened.current = true;
            setMounted(true);
            setOpen(true);
        }
    };

    const handleSelect = item => {
        onChange && onChange(item.id, item);
        Keyboard.dismiss();
        setOpen(false);
    };

    const arrowRotate = fadeAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

    return (
        <View collapsable={false} style={[styles.field, wide && { flex: 1 }]}>
            {label ? <Text style={styles.label}>{label}</Text> : null}

            <TouchableOpacity
                ref={triggerRef}
                collapsable={false}
                style={[styles.dropdown, open && styles.dropdownOpen, disabled && { opacity: 0.55 }]}
                onPress={toggle}
                activeOpacity={0.8}
            >
                <View style={styles.ddTriggerLeft}>
                    <Text style={selected ? styles.selectedText : styles.placeholder} numberOfLines={1}>
                        {selected ? selected.name : placeholder || 'Select'}
                    </Text>
                </View>
                <Animated.View style={{ transform: [{ rotate: arrowRotate }] }}>
                    <Icon name="keyboard-arrow-down" size={20} color="#8a9daf" />
                </Animated.View>
            </TouchableOpacity>

            {mounted && (
                <Animated.View
                    style={[
                        styles.dropdownMenu,
                        {
                            height: heightAnim,
                            opacity: fadeAnim,
                            overflow: 'hidden',
                            transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }],
                        },
                    ]}
                >
                    <View style={[styles.ddSearchWrap, { height: SEARCH_H }]}>
                        <Icon name="search" size={16} color="#aaa" style={{ marginRight: 6 }} />
                        <TextInput
                            style={styles.ddSearchInput}
                            placeholder="Search..."
                            placeholderTextColor="#bbb"
                            value={search}
                            onChangeText={setSearch}
                            autoCorrect={false}
                            autoCapitalize="none"
                            returnKeyType="done"
                            blurOnSubmit
                            underlineColorAndroid="transparent"
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                                <Icon name="close" size={14} color="#ccc" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always" nestedScrollEnabled>
                        {filtered.length === 0 ? (
                            <Text style={styles.ddNoResult}>No results found</Text>
                        ) : (
                            filtered.map(item => {
                                const isActive = sameId(item.id, value);
                                return (
                                    <TouchableOpacity
                                        key={String(item.id)}
                                        style={[styles.dropdownItem, { height: ITEM_H }, isActive && styles.dropdownItemActive]}
                                        onPress={() => handleSelect(item)}
                                        activeOpacity={0.7}
                                    >
                                        <Text
                                            style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}
                                            numberOfLines={1}
                                        >
                                            {item.name}
                                        </Text>
                                        {item.tag ? (
                                            <View
                                                style={[
                                                    styles.ddTag,
                                                    item.tagColor && { borderColor: item.tagColor, backgroundColor: item.tagColor + '22' },
                                                ]}
                                            >
                                                <Text style={[styles.ddTagText, item.tagColor && { color: item.tagColor }]}>
                                                    {item.tag}
                                                </Text>
                                            </View>
                                        ) : null}
                                        {isActive && <Icon name="check" size={16} color="#1482cc" />}
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>
                </Animated.View>
            )}

            {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
    );
};

// ─── SMALL BUTTONS ───────────────────────────────────────────────────────────
const AddMoreBtn = ({ label = 'Add More', onPress }) => (
    <TouchableOpacity style={styles.addMoreBtn} onPress={onPress} activeOpacity={0.75}>
        <Icon name="add-circle-outline" size={15} color={COLORS.accent} />
        <Text style={styles.addMoreText}>{label}</Text>
    </TouchableOpacity>
);

const RemoveBtn = ({ onPress }) => (
    <TouchableOpacity
        style={styles.removeBtn}
        onPress={onPress}
        activeOpacity={0.8}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
        <Icon name="delete-outline" size={17} color={COLORS.red} />
    </TouchableOpacity>
);

const SubmitSmall = ({ onPress, loading, label = 'Submit' }) => (
    <TouchableOpacity style={styles.submitSmall} activeOpacity={0.85} onPress={onPress} disabled={loading}>
        {loading ? (
            <ActivityIndicator size="small" color={COLORS.green} />
        ) : (
            <Icon name="check" size={14} color={COLORS.green} />
        )}
        <Text style={styles.submitSmallText}>{loading ? 'Saving' : label}</Text>
    </TouchableOpacity>
);

// locked = already saved on the server: shown dimmed, not editable or removable
const RepeatRow = ({ children, canRemove, onRemove, locked }) => {
    const wide = useWide();
    return (
        <View style={[{ marginBottom: 4 }, wide && { flexDirection: 'row', alignItems: 'flex-end', gap: 10 }]}>
            <View style={[{ flex: 1 }, locked && { opacity: 0.6 }]} pointerEvents={locked ? 'none' : 'auto'}>
                {children}
            </View>
            {canRemove && !locked ? (
                <View style={wide ? { marginBottom: 10 } : { alignSelf: 'flex-end', marginBottom: 8 }}>
                    <RemoveBtn onPress={onRemove} />
                </View>
            ) : null}
        </View>
    );
};

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function CreateProject() {
    const navigation = useNavigation();
    const route = useRoute();
    const insets = useSafeAreaInsets();
    const wide = useWide();

    const scrollRef = useRef(null);
    const scrollYRef = useRef(0);

    const [kbHeight, setKbHeight] = useState(0);
    const kbTopRef = useRef(null);

    // ── custom modal (same call shape as Alert.alert, plus a `type`) ──
    const [modal, setModal] = useState(null);
    const closeModal = () => setModal(null);
    // appAlert(title, message, buttons, type)  type: error | success | warning | info | confirm
    const appAlert = (title, message, buttons, type = 'info') => {
        Keyboard.dismiss();
        setModal({ title, message, buttons, type });
    };

    useEffect(() => {
        const showSub = Keyboard.addListener(KB_SHOW, e => {
            kbTopRef.current = e?.endCoordinates?.screenY ?? null;
            setKbHeight(e?.endCoordinates?.height || 0);
        });
        const hideSub = Keyboard.addListener(KB_HIDE, () => {
            kbTopRef.current = null;
            setKbHeight(0);
        });
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const [step, setStep] = useState(0);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [busy, setBusy] = useState(null); // which button is saving
    // edit mode: opened from the Projects list with route.params.editItem
    const editItem = route.params?.editItem || null;
    const isEdit = !!editItem;
    const [form, setForm] = useState(() => (editItem ? buildEditForm(editItem) : makeForm(route.params?.projectId)));

    // the screen can stay mounted (navigate() re-uses it): rebuild the form when another project is opened
    const editKey = editItem ? String(editItem.id ?? editItem.projectId) : '';
    const builtKey = useRef(editKey);
    useEffect(() => {
        if (editKey === builtKey.current) return; // already built by useState on mount
        builtKey.current = editKey;
        setBlocks([]);
        setUnits([]);
        setFloors([]);
        setStep(0);
        if (!editKey) {
            setForm(makeForm(route.params?.projectId));
            saved.current = { details: null, location: null, timeline: null, booking: {} };
            pricingsRef.current = [];
            return;
        }
        if (__DEV__) console.log('editItem', JSON.stringify(editItem));
        const f = buildEditForm(editItem);
        setForm(f);
        saved.current = {
            details: detailsSig(f),
            location: editItem.locations?.length ? locationSig(f) : null,
            timeline: editItem.timelines?.length ? `${f.project}|${f.launch}|${f.possession}` : null,
            booking: {},
        };
        pricingsRef.current = (editItem.pricings || []).map(x => ({
            pricing_id: x.id,
            phase_id: Number(x.phase_id),
            block_id: Number(x.block_id),
            booking_amount: Number(x.booking_amount),
        }));
        loadEditData();
    }, [editKey]);

    // location fields depend on the country: India uses the state / city lists, others are typed in
    const isIndia = form.country === 'india';

    // ── server data ──
    const [masters, setMasters] = useState({
        projects: [], projectTypes: [], categories: [], statuses: STATUS_OPTS,
        locations: [], configurations: [], unitTypes: [], plcs: [],
    });
    const [loadFailed, setLoadFailed] = useState([]);
    const [blocks, setBlocks] = useState([]); // [{ id, phaseId, name, floors, units, parking }]
    const [units, setUnits] = useState([]);   // units of the selected pricing tower
    const [floors, setFloors] = useState([]); // floors of the selected tower (Unit Configuration)

    // remembers what was already saved so going Back/Next doesn't create duplicates
    const saved = useRef({ details: null, location: null, timeline: null, booking: {} });
    if (isEdit && saved.current.details === null) {
        // what is already on the server: unchanged steps are not sent again
        saved.current.details = detailsSig(form);
        if (editItem.locations?.length) saved.current.location = locationSig(form);
        if (editItem.timelines?.length) saved.current.timeline = `${form.project}|${form.launch}|${form.possession}`;
    }
    // every booking amount of the project (the pricing API syncs the whole project in one call)
    const pricingsRef = useRef(
        (editItem?.pricings || []).map(x => ({
            pricing_id: x.id,
            phase_id: Number(x.phase_id),
            block_id: Number(x.block_id),
            booking_amount: Number(x.booking_amount),
        })),
    );

    useEffect(() => {
        const defs = [
            ['projects', ENDPOINTS.projects],
            ['projectTypes', ENDPOINTS.projectTypes],
            ['categories', ENDPOINTS.categories],
            ['locations', ENDPOINTS.locations],
            ['configurations', ENDPOINTS.configurations],
            ['unitTypes', ENDPOINTS.unitTypes],
            ['plcs', ENDPOINTS.plcMaster],
        ];
        Promise.allSettled(
            defs.map(([key, ep]) =>
                ep
                    ? (key === 'projects' ? fetchAllProjects() : request(ep).then(r => toOpts(r.data))).then(o => [key, o])
                    : Promise.reject(new Error('endpoint not set')),
            ),
        ).then(results => {
            const next = {};
            const failed = [];
            results.forEach((r, i) => {
                if (r.status === 'fulfilled') next[r.value[0]] = r.value[1];
                else failed.push(defs[i][0]);
            });
            setMasters(m => ({ ...m, ...next }));
            setLoadFailed(failed);
        });
    }, []);

    // towers of one phase. Returns the rows so the caller can fill the tower inputs (edit mode)
    const loadBlocks = async phaseId => {
        try {
            const r = await request(`getAllPropertyBlockByPhaseId/${phaseId}`);
            const rows = (r.data || [])
                .filter(b => b.active === undefined || b.active === null || String(b.active) === '1')
                .map(b => ({
                    id: b.id,
                    phaseId,
                    name: b.block_name,
                    floors: b.total_floors,
                    units: b.total_units,
                    parking: b.parking_slots,
                }));
            setBlocks(prev => [...prev.filter(b => b.phaseId !== phaseId), ...rows]);
            return rows;
        } catch (e) {
            appAlert('Could not load towers', e.message, [{ text: 'OK' }], 'error');
            return [];
        }
    };

    // a saved tower as a form row (editable, sent with block_id = recordId)
    const toTowerRow = b => ({
        tower: b.name,
        floors: String(b.floors ?? ''),
        units: String(b.units ?? ''),
        parking: String(b.parking ?? ''),
        id: null,
        recordId: b.id,
    });

    // edit mode: phases of the project (getAllPropertyPhaseByProId/{projectId})
    const loadPhases = async () => {
        const r = await request(`${ENDPOINTS.phasesByProject}/${form.project}`);
        const rows = (r.data || [])
            .filter(p => String(p.active) === '1')
            .map(p => ({ name: p.phase_name, id: null, recordId: p.id }));
        setForm(p => ({ ...p, phases: [...rows, { ...emptyPhase }] }));
        return rows;
    };

    // edit mode: load the saved phases, then pre-select the first phase and its first tower so the
    // towers, units, prices, escalations and PLCs of the project are already visible in the inputs
    const autoSelect = async rows => {
        const ph = rows?.[0]?.recordId;
        if (!ph) return;
        setForm(p => ({ ...p, glancePhase: ph, pricePhase: ph }));
        const bl = await loadBlocks(ph);
        setForm(p => ({ ...p, towers: [...bl.map(toTowerRow), { ...emptyTower }] }));
        const b = bl[0];
        if (!b) return;
        setForm(p => ({ ...p, priceTower: b.id }));
        loadUnits(b.id);
        loadTowerData(ph, b.id);
        pickConfigTower(b.id, ph);
    };
    const loadEditData = () =>
        loadPhases()
            .then(autoSelect)
            .catch(e => appAlert('Could not load phases', e.message, [{ text: 'OK' }], 'error'));

    useEffect(() => {
        if (isEdit) loadEditData();
    }, []);

    const loadUnits = async blockId => {
        try {
            const r = await request(`getAllPropertyUnitsByBlockId/${blockId}`);
            setUnits(r.data || []);
        } catch (e) {
            setUnits([]);
            appAlert('Could not load units', e.message, [{ text: 'OK' }], 'error');
        }
    };

    // floors of one tower, e.g. getAllPropertyFloorByPhaseBlockId/59/98 (phase 59, tower 98)
    const loadFloors = async (phaseId, blockId) => {
        try {
            const r = await request(`${ENDPOINTS.floorsByPhaseBlock}/${phaseId}/${blockId}`);
            setFloors(r.data || []);
        } catch (e) {
            setFloors([]);
            appAlert('Could not load floors', e.message, [{ text: 'OK' }], 'error');
        }
    };

    // ── edit mode: load what is already saved for the selected phase + tower ──
    const sameTower = (x, ph, bl) => String(x.phase_id) === String(ph) && String(x.block_id) === String(bl);

    const loadBooking = async (phaseId, blockId) => {
        const r = await request(`getAllPropertyProjectPricing/${form.project}/${phaseId}/${blockId}`);
        const row = (r.data || [])[0];
        if (row) {
            const entry = {
                pricing_id: row.id,
                phase_id: Number(phaseId),
                block_id: Number(blockId),
                booking_amount: Number(row.booking_amount),
            };
            pricingsRef.current = [...pricingsRef.current.filter(x => !sameTower(x, phaseId, blockId)), entry];
        }
        setForm(p => ({ ...p, booking: row ? String(Number(row.booking_amount)) : '' }));
    };
    const loadPrices = async (phaseId, blockId) => {
        const r = await request(`getAllPropertyProjectPriceDateWise/${phaseId}/${blockId}`);
        const rows = (r.data || []).map(x => ({
            price: String(Number(x.price_per_sqft)), date: String(x.date).slice(0, 10), id: null, recordId: x.id,
        }));
        setForm(p => ({ ...p, prices: rows.length ? rows : [{ ...emptyPrice }] }));
    };
    const loadEsc = async (phaseId, blockId) => {
        const r = await request(`getAllPropertyProjectFloorEscalation/${phaseId}/${blockId}`);
        const rows = (r.data || []).map(x => ({
            from: String(x.floor_number), to: '', rate: String(Number(x.amount_per_sqft)), id: null, recordId: x.id,
        }));
        setForm(p => ({ ...p, escMode: 'Without Range', escalations: rows.length ? rows : [{ ...emptyEsc }] }));
    };
    const loadPlcs = async (phaseId, blockId) => {
        const r = await request(`getAllPropertyPLC/${phaseId}/${blockId}`);
        const rows = (r.data || []).map(x => ({
            plc: x.plc_id, unitId: x.unit_id, amount: String(x.amount), id: null, recordId: x.id,
        }));
        setForm(p => ({ ...p, plcs: rows.length ? rows : [{ ...emptyPlc }] }));
    };
    const towerLoaders = { booking: loadBooking, prices: loadPrices, esc: loadEsc, plcs: loadPlcs };
    const loadTowerData = (phaseId, blockId, parts = ['booking', 'prices', 'esc', 'plcs']) =>
        Promise.allSettled(parts.map(k => towerLoaders[k](phaseId, blockId)));

    // ── local cache: draft autosave + last submitted snapshot ──
    const canSave = useRef(false);      // true once the "resume draft?" question is settled
    const submittedRef = useRef(false); // true after the final submit (stops autosave)

    // on open: offer to resume an unfinished draft
    useEffect(() => {
        (async () => {
            if (isEdit) return; // editing a saved project: no draft (autosave stays off)
            try {
                const raw = route.params?.projectId ? null : await AsyncStorage.getItem(DRAFT_KEY);
                if (!raw) {
                    canSave.current = true;
                    return;
                }
                const d = JSON.parse(raw);
                appAlert(
                    'Resume your draft?',
                    'You have an unfinished project setup. Do you want to continue where you left off?',
                    [
                        {
                            text: 'Discard',
                            style: 'destructive',
                            onPress: () => {
                                AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
                                canSave.current = true;
                            },
                        },
                        {
                            text: 'Resume',
                            onPress: () => {
                                canSave.current = true;
                                saved.current = d.saved || saved.current;
                                setBlocks(d.blocks || []);
                                // old drafts stored country as 'India' and had no cityText
                                const f = d.form || {};
                                const country = !f.country || f.country === 'India' ? 'india' : f.country;
                                setForm({ ...f, country, cityText: f.cityText || '' });
                                setStep(d.step || 0);
                                if (f.priceTower) loadUnits(f.priceTower);
                                if (f.glancePhase && f.configTower) loadFloors(f.glancePhase, f.configTower);
                            },
                        },
                    ],
                    'confirm',
                );
            } catch (e) {
                canSave.current = true;
            }
        })();
    }, []);

    // auto-save the draft in the background (debounced, never blocks the UI)
    const draftSaved = useRef(false); // a draft exists in the cache
    const leavingRef = useRef(false); // user already chose what to do on exit
    const firstRun = useRef(true);
    useEffect(() => {
        if (firstRun.current) {
            firstRun.current = false; // nothing typed yet, don't save an empty draft
            return;
        }
        const t = setTimeout(() => {
            if (!canSave.current || submittedRef.current) return;
            AsyncStorage.setItem(
                DRAFT_KEY,
                JSON.stringify({ form, step, blocks, saved: saved.current, updatedAt: Date.now() }),
            )
                .then(() => {
                    draftSaved.current = true;
                })
                .catch(() => {});
        }, 600);
        return () => clearTimeout(t);
    }, [form, step, blocks]);

    // leaving without a final submit (back button, swipe, Cancel): keep or discard the draft
    useEffect(() => {
        const unsub = navigation.addListener('beforeRemove', e => {
            if (submittedRef.current || leavingRef.current || !draftSaved.current) return;
            e.preventDefault();
            appAlert(
                'Leave without submitting?',
                'Your progress is saved as a draft. You can keep it and continue later, or discard it.',
                [
                    { text: 'Stay', style: 'cancel' },
                    {
                        text: 'Keep draft',
                        onPress: () => {
                            leavingRef.current = true;
                            navigation.dispatch(e.data.action);
                        },
                    },
                    {
                        text: 'Discard draft',
                        style: 'destructive',
                        onPress: async () => {
                            leavingRef.current = true;
                            submittedRef.current = true; // stops autosave from re-creating it
                            await AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
                            navigation.dispatch(e.data.action);
                        },
                    },
                ],
                'warning',
            );
        });
        return unsub;
    }, [navigation]);

    // final submit: keep a snapshot of everything submitted, clear the draft
    const cacheSubmitted = async () => {
        submittedRef.current = true;
        const snapshot = { submittedAt: new Date().toISOString(), projectId: form.project, form, blocks };
        try {
            await AsyncStorage.setItem(LAST_SUBMIT_KEY, JSON.stringify(snapshot));
            await AsyncStorage.removeItem(DRAFT_KEY);
        } catch (e) {
            // cache failure must not block the user
        }
        // other screens (or a redux listener) can react: DeviceEventEmitter.addListener('projectSubmitted', fn)
        DeviceEventEmitter.emit('projectSubmitted', snapshot);
    };

    // ── form helpers ──
    const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
    const setRow = (key, idx, field, val) =>
        setForm(p => ({ ...p, [key]: p[key].map((r, i) => (i === idx ? { ...r, [field]: val } : r)) }));
    const addRow = (key, empty) => setForm(p => ({ ...p, [key]: [...p[key], { ...empty }] }));
    const removeRow = (key, idx) => setForm(p => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }));
    const markSaved = (key, idxs, created = []) =>
        setForm(p => ({
            ...p,
            [key]: p[key].map((r, i) => {
                const k = idxs.indexOf(i);
                return k >= 0 ? { ...r, id: created[k]?.id ?? true } : r;
            }),
        }));
    // rows of `key` that are not saved yet
    const pending = key => form[key].map((r, i) => ({ r, i })).filter(({ r }) => !r.id);

    // run an async save with a busy flag + error modal
    const run = async (name, fn) => {
        setBusy(name);
        try {
            await fn();
            return true;
        } catch (e) {
            appAlert('Could not save', e.message || 'Something went wrong.', [{ text: 'OK' }], 'error');
            return false;
        } finally {
            setBusy(null);
        }
    };

    const needPhaseTower = () => {
        if (!form.project) throw new Error('Select a project in step 1.');
        if (!form.pricePhase || !form.priceTower) throw new Error('Select a phase and a tower.');
    };

    // changing the country clears the fields that depend on it
    const pickCountry = v => setForm(p => ({ ...p, country: v, state: '', city: '', cityText: '' }));

    // ── SAVE: step 1 ──
    const saveDetails = async () => {
        if (!form.project) throw new Error('Select a project.');
        if (!form.projectType || !form.category) throw new Error('Select the project type and category.');
        const sig = isEdit ? detailsSig(form) : form.project;
        if (saved.current.details === sig) return; // already saved
        const body = {
            rera_registration_number: form.rera,
            project_type_id: form.projectType,
            project_category_id: form.category,
            construction_status: form.status ? String(form.status) : null,
            project_overview: form.overview,
        };
        if (isEdit) {
            await request(`updatePropertyProjectDetails/${editItem.id}`, 'PUT', body); // id = details record id
        } else {
            await request('createPropertyProjectDetails', 'POST', { project_id: form.project, ...body });
        }
        saved.current.details = sig;
    };

    // ── SAVE: step 2 ──
    const saveLocation = async () => {
        if (!form.project) throw new Error('Select a project in step 1.');
        if (!form.country) throw new Error('Select the country.');
        if (!form.state || !String(form.state).trim()) throw new Error(isIndia ? 'Select the state.' : 'Enter the state / region.');
        if (isIndia && !form.city) throw new Error('Select the city.');
        if (!isIndia && !form.cityText.trim()) throw new Error('Enter the city.');
        const sig = isEdit ? locationSig(form) : form.project;
        if (saved.current.location === sig) return;
        const body = {
            location_id: isIndia ? form.city : null,
            city_name: isIndia ? undefined : form.cityText.trim(), // TODO: confirm this field name with the backend
            site_address: form.address,
            neighbourhood_details: form.locality,
            nearby_landmark: form.landmark,
            pin_code: form.pin,
            state: String(form.state).trim(),
            country: countryName(form.country), // "India", "United Arab Emirates", ...
            map_location_link: form.mapLink || null,
        };
        const locId = editItem?.locations?.[0]?.id; // id of the saved location record
        if (isEdit && locId) {
            await request(`updatePropertyLocationDetails/${locId}`, 'PUT', body);
        } else {
            await request('createPropertyLocationDetails', 'POST', { project_id: form.project, ...body });
        }
        saved.current.location = sig;
    };

    // ── SAVE: step 3 ──
    // edit mode: PUT the full phase list (rows with phase_id are updated, rows without one are created,
    // rows left out are removed), then reload so new phases get their ids.
    const savePhases = async () => {
        if (!form.project) throw new Error('Select a project in step 1.');
        if (isEdit) {
            const phases = form.phases
                .filter(p => p.name.trim())
                .map(p => ({ ...(p.recordId ? { phase_id: p.recordId } : {}), phase_name: p.name.trim() }));
            if (!phases.length) throw new Error('Enter at least one phase name.');
            await request('updatePropertyPhase', 'PUT', { pro_id: Number(form.project), phases });
            await loadPhases();
            return;
        }
        const rows = pending('phases').filter(({ r }) => r.name.trim());
        if (!rows.length) throw new Error('Enter at least one new phase name.');
        const res = await request('createPropertyPhase', 'POST', {
            pro_id: form.project,
            phases: rows.map(({ r }) => ({ phase_name: r.name.trim() })),
        });
        markSaved('phases', rows.map(x => x.i), res.data);
    };

    const saveTowers = async () => {
        if (!form.glancePhase) throw new Error('Select a phase first.');
        if (isEdit) {
            const blocksBody = form.towers
                .filter(r => r.tower.trim())
                .map(r => ({
                    ...(r.recordId ? { block_id: r.recordId } : {}),
                    block_name: r.tower.trim(),
                    total_floors: Number(r.floors) || 0,
                    total_units: Number(r.units) || 0,
                    parking_slots: Number(r.parking) || 0,
                }));
            if (!blocksBody.length) throw new Error('Enter at least one tower.');
            await request('updatePropertyBlock', 'PUT', { phase_id: Number(form.glancePhase), blocks: blocksBody });
            const rows = await loadBlocks(form.glancePhase);
            setForm(p => ({ ...p, towers: [...rows.map(toTowerRow), { ...emptyTower }] }));
            return;
        }
        const rows = pending('towers').filter(({ r }) => r.tower.trim());
        if (!rows.length) throw new Error('Enter at least one new tower.');
        const res = await request('createPropertyBlock', 'POST', {
            phase_id: form.glancePhase,
            blocks: rows.map(({ r }) => ({
                block_name: r.tower.trim(),
                block_possession_date: null,
                total_floors: Number(r.floors) || 0,
                total_units: Number(r.units) || 0,
                parking_slots: Number(r.parking) || 0,
            })),
        });
        const created = res.data || [];
        markSaved('towers', rows.map(x => x.i), created);
        setBlocks(prev => [
            ...prev,
            ...created.map(b => ({ id: b.id, phaseId: form.glancePhase, name: b.block_name })),
        ]);
    };

    const saveUnits = async () => {
        if (!form.configTower) throw new Error('Select a tower first.');
        const rows = pending('configs').filter(({ r }) => r.unitName || r.configuration || r.unitType);
        if (!rows.length) throw new Error('Add at least one new unit.');
        for (const { r } of rows) {
            if (!r.configuration || !r.unitType || !r.floor || !r.unitName.trim()) {
                throw new Error('Each unit needs a configuration, unit type, floor and unit name.');
            }
        }
        const res = await request('createPropertyUnits', 'POST', {
            block_id: form.configTower,
            units: rows.map(({ r }) => ({
                unit_type_id: r.unitType,
                configuration_id: r.configuration,
                floor_id: Number(r.floor), // id picked from the floors API (units store floor_id). TODO: confirm with the backend
                unit_name: r.unitName.trim(),
                carpet_area: Number(r.carpet) || 0,
                balcony_area: Number(r.balcony) || 0,
                super_built_up_area: Number(r.saleable) || 0,
            })),
        });
        markSaved('configs', rows.map(x => x.i), res.data);
    };

    // ── SAVE: step 4 ──
    // create mode: POST the new rows. edit mode: PUT the full list of the tower (rows with an id are
    // updated, rows without one are created, rows left out are removed), then reload it from the server.
    const saveBooking = async () => {
        needPhaseTower();
        if (!form.booking) throw new Error('Enter the booking amount.');
        if (isEdit) {
            const cur = pricingsRef.current.find(x => sameTower(x, form.pricePhase, form.priceTower));
            const entry = {
                ...(cur?.pricing_id ? { pricing_id: cur.pricing_id } : {}),
                phase_id: Number(form.pricePhase),
                block_id: Number(form.priceTower),
                booking_amount: Number(form.booking),
            };
            // the API syncs the whole project, so every known pricing is sent back with this one changed
            const pricings = [...pricingsRef.current.filter(x => x !== cur), entry];
            await request('updatePropertyProjectPricing', 'PUT', { pro_id: form.project, pricings });
            pricingsRef.current = pricings;
            await loadTowerData(form.pricePhase, form.priceTower, ['booking']); // picks up a new pricing_id
            return;
        }
        if (saved.current.booking[form.priceTower]) throw new Error('Booking amount is already saved for this tower.');
        await request('createPropertyProjectPricing', 'POST', {
            pro_id: form.project,
            phase_id: form.pricePhase,
            block_id: form.priceTower,
            booking_amount: Number(form.booking),
        });
        saved.current.booking[form.priceTower] = true;
    };

    const savePrices = async () => {
        needPhaseTower();
        const rows = (isEdit ? form.prices.map((r, i) => ({ r, i })) : pending('prices')).filter(({ r }) => r.price && r.date);
        if (!rows.length) throw new Error('Enter a price and a date.');
        if (isEdit) {
            await request('updatePropertyProjectPriceDateWise', 'PUT', {
                block_id: Number(form.priceTower),
                prices: rows.map(({ r }) => ({
                    ...(r.recordId ? { price_id: r.recordId } : {}),
                    price_per_sqft: Number(r.price),
                    date: r.date,
                })),
            });
            await loadTowerData(form.pricePhase, form.priceTower, ['prices']);
            return;
        }
        await request('createPropertyProjectPriceDateWise', 'POST', {
            phase_id: form.pricePhase,
            block_id: form.priceTower,
            prices: rows.map(({ r }) => ({ price_per_sqft: Number(r.price), date: r.date })),
        });
        markSaved('prices', rows.map(x => x.i));
    };

    const saveEscalations = async () => {
        needPhaseTower();
        const rows = (isEdit ? form.escalations.map((r, i) => ({ r, i })) : pending('escalations')).filter(({ r }) => r.from && r.rate);
        if (!rows.length) throw new Error('Enter a floor and a rate.');
        // the API takes one floor per row, so a range is expanded floor by floor
        const escalations = [];
        rows.forEach(({ r }) => {
            const from = Number(r.from);
            const to = form.escMode === 'With Range' ? Number(r.to) : from;
            if (!from || !to || to < from || to > 200) throw new Error('Check the floor numbers.');
            for (let f = from; f <= to; f++) {
                escalations.push({
                    ...(isEdit && r.recordId && from === to ? { escalation_id: r.recordId } : {}),
                    floor_number: f,
                    amount_per_sqft: Number(r.rate),
                });
            }
        });
        if (isEdit) {
            await request('updatePropertyProjectFloorEscalation', 'PUT', { block_id: Number(form.priceTower), escalations });
            await loadTowerData(form.pricePhase, form.priceTower, ['esc']);
            return;
        }
        await request('createPropertyProjectFloorEscalation', 'POST', {
            phase_id: form.pricePhase,
            block_id: form.priceTower,
            escalations,
        });
        markSaved('escalations', rows.map(x => x.i));
    };

    const savePlcs = async () => {
        needPhaseTower();
        const rows = (isEdit ? form.plcs.map((r, i) => ({ r, i })) : pending('plcs')).filter(({ r }) => r.plc || r.unitId || r.amount);
        if (!rows.length) throw new Error('Choose a PLC, a unit and an amount.');
        for (const { r } of rows) {
            if (!r.plc || !r.unitId || !r.amount) throw new Error('Each PLC needs a PLC, a unit and an amount.');
        }
        if (isEdit) {
            await request('updatePropertyPLC', 'PUT', {
                block_id: Number(form.priceTower),
                plcs: rows.map(({ r }) => ({
                    ...(r.recordId ? { plc_record_id: r.recordId } : {}),
                    plc_id: r.plc,
                    unit_id: r.unitId,
                    amount: Number(r.amount),
                })),
            });
            await loadTowerData(form.pricePhase, form.priceTower, ['plcs']);
            return;
        }
        await request('createPropertyPLC', 'POST', {
            phase_id: form.pricePhase,
            block_id: form.priceTower,
            plcs: rows.map(({ r }) => ({ plc_id: r.plc, unit_id: r.unitId, amount: Number(r.amount) })),
        });
        markSaved('plcs', rows.map(x => x.i));
    };

    // ── SAVE: step 5 ──
    // TODO (edit mode): send the update request of the timeline API (GET is getAllPropertyProjectTImeline/{projectId}).
    // Until it is known, edit mode with an unchanged saved timeline is skipped, a changed one still calls create.
    const saveTimeline = async () => {
        if (!form.project) throw new Error('Select a project in step 1.');
        if (!form.launch || !form.possession) throw new Error('Select the launch date and the expected possession date.');
        if (form.possession < form.launch) throw new Error('Possession date cannot be before the launch date.');
        // already saved with the same dates: don't create a duplicate
        const key = `${form.project}|${form.launch}|${form.possession}`;
        if (saved.current.timeline === key) return;
        await request(ENDPOINTS.createTimeline, 'POST', {
            pro_id: form.project,
            project_launch_date: form.launch,
            expected_possession_date: form.possession,
        });
        saved.current.timeline = key;
    };

    // ── navigation ──
    const isLast = step === STEPS.length - 1;
    const goBack = () => (step === 0 ? navigation.goBack() : setStep(s => s - 1));
    const goNext = async () => {
        const ok = await run('next', async () => {
            if (step === 0) await saveDetails();
            if (step === 1) await saveLocation();
            if (isLast) await saveTimeline();
        });
        if (!ok) return;
        if (isLast) {
            await cacheSubmitted();
            appAlert(
                isEdit ? 'Project updated' : 'Project submitted',
                isEdit ? 'The project details were updated successfully.' : 'All the project details were saved successfully.',
                [{ text: 'Done', onPress: () => navigation.goBack() }],
                'success',
            );
        } else setStep(s => s + 1);
    };

    // ── derived dropdown options ──
    // edit mode: the saved value must be in the list, otherwise the dropdown shows "Select" (the master lists
    // hide inactive rows and keep only one id per name)
    const withSaved = (list, id, name) =>
        isEdit && id !== '' && id !== null && id !== undefined && name && name !== '-' && !list.some(o => String(o.id) === String(id))
            ? [...list, { id, name }]
            : list;
    const projectOpts = withSaved(masters.projects, form.project, editItem?.name);
    const typeOpts = withSaved(masters.projectTypes, form.projectType, editItem?.type);
    const categoryOpts = withSaved(masters.categories, form.category, editItem?.category);
    const cityOpts = withSaved(masters.locations, form.city, editItem?.locations?.[0]?.propertylocation?.name);
    const stateOpts = isIndia && form.state && !OPT.state.includes(form.state) ? [...OPT.state, form.state] : OPT.state;
    // saved phases carry `recordId` (edit mode) or `id` (create mode)
    const phaseOpts = form.phases
        .filter(p => (p.recordId ?? p.id) && p.name)
        .map(p => ({ id: p.recordId ?? p.id, name: p.name }));
    const towerOptsFor = phaseId => blocks.filter(b => b.phaseId === phaseId).map(b => ({ id: b.id, name: b.name }));
    const unitOpts = units.map(u => ({ id: u.id, name: `Unit ${u.unit_name} (Floor ${u.propertyfloor?.floor_no ?? u.floor_id})` }));
    // floor dropdown comes from the API. Field names (id, floor_no) are a guess:
    // check them against the real response of getAllPropertyFloorByPhaseBlockId/{phase}/{block}
    const floorOpts = floors.map(f => ({ id: f.id, name: String(f.floor_no ?? f.floor_number ?? f.floor_name ?? f.id) }));

    // phase pickers also load that phase's towers from the server
    // fills the tower inputs with the towers already saved for a phase (edit mode)
    const fillTowers = async phaseId => {
        const rows = await loadBlocks(phaseId);
        setForm(p =>
            p.glancePhase !== phaseId
                ? p // user picked another phase meanwhile
                : { ...p, towers: [...rows.map(toTowerRow), { ...emptyTower }] },
        );
    };
    const pickGlancePhase = id => {
        setForm(p => ({ ...p, glancePhase: id, configTower: '', towers: [{ ...emptyTower }], configs: [{ ...emptyConfig }] }));
        setFloors([]); // the tower resets, so the old floors go too
        if (isEdit) fillTowers(id); // show the towers that are already saved (editable, sent with block_id)
        else loadBlocks(id);
    };
    const pickPricePhase = id => {
        setForm(p => ({
            ...p,
            pricePhase: id,
            priceTower: '',
            // edit mode: the rows shown belong to the tower, so they are cleared until a tower is picked
            ...(isEdit ? { booking: '', prices: [{ ...emptyPrice }], escalations: [{ ...emptyEsc }], plcs: [{ ...emptyPlc }] } : {}),
        }));
        setUnits([]);
        loadBlocks(id);
    };
    const pickPriceTower = id => {
        set('priceTower', id);
        loadUnits(id);
        if (isEdit) loadTowerData(form.pricePhase, id); // show what is already saved for this tower
    };
    // picking the tower in Available Configurations loads its floors (and, in edit mode, its saved units)
    const pickConfigTower = async (id, phaseId = form.glancePhase) => {
        set('configTower', id);
        loadFloors(phaseId, id);
        if (!isEdit) return;
        try {
            const r = await request(`getAllPropertyUnitsByBlockId/${id}`);
            const rows = (r.data || []).map(u => ({
                configuration: u.configuration_id ?? '',
                unitType: u.unit_type_id ?? '',
                floor: u.floor_id ?? '',
                unitName: String(u.unit_name ?? ''),
                saleable: String(u.super_built_up_area ?? ''),
                carpet: String(u.carpet_area ?? ''),
                balcony: String(u.balcony_area ?? ''),
                id: u.id, // id set = locked, because there is no unit update endpoint yet
            }));
            setForm(p => ({ ...p, configs: [...rows, { ...emptyConfig }] }));
        } catch (e) {
            appAlert('Could not load units', e.message, [{ text: 'OK' }], 'error');
        }
    };

    // ── preview: what is filled and what is still blank ──
    const buildPreview = () => {
        const f = form;
        const has = v => v !== undefined && v !== null && String(v).trim() !== '';
        const nameOf = (list, id) => (list.find(o => o.id === id) || {}).name;
        const fld = (label, value, required) => ({ label, value: has(value) ? String(value).trim() : '', required: !!required });

        // repeated rows (phases, towers, ...): one line per row that has something, or a single "Not filled"
        const list = (title, rows, partsOf) => {
            const out = [];
            rows.forEach((r, i) => {
                const parts = partsOf(r);
                const filled = parts.filter(([, v]) => has(v));
                if (!filled.length) return;
                const miss = parts.filter(([, v]) => !has(v)).map(([c]) => c);
                out.push({
                    label: `${title} ${i + 1}`,
                    value: filled.map(([c, v]) => (c ? `${c}: ${String(v).trim()}` : String(v).trim())).join('  •  '),
                    saved: !!(r.id || r.recordId),
                    note: miss.length ? `Missing: ${miss.join(', ')}` : '',
                });
            });
            return out.length ? out : [{ label: title, value: '' }];
        };

        const sections = [
            {
                step: 0, title: 'Project Details', icon: 'business',
                rows: [
                    fld('Project', nameOf(projectOpts, f.project), true),
                    fld('RERA Registration Number', f.rera),
                    fld('Project Type', nameOf(typeOpts, f.projectType), true),
                    fld('Property Category', nameOf(categoryOpts, f.category), true),
                    fld('Construction Status', nameOf(masters.statuses, f.status)),
                    fld('Project Overview', f.overview),
                ],
            },
            {
                step: 1, title: 'Location', icon: 'location-on',
                rows: [
                    fld('Site Address', f.address),
                    fld('Locality / Neighbourhood', f.locality),
                    fld('Nearby landmark', f.landmark),
                    fld('Country', countryName(f.country), true),
                    fld(isIndia ? 'State' : 'State / Region', f.state, true),
                    fld('City', isIndia ? nameOf(cityOpts, f.city) : f.cityText, true),
                    fld(isIndia ? 'PIN code' : 'Postal code', f.pin),
                    fld('Google Maps link', f.mapLink),
                ],
            },
            {
                step: 2, title: 'Unit Configuration', icon: 'domain',
                rows: [
                    ...list('Phase', f.phases, r => [['', r.name]]),
                    fld('Selected phase (towers)', nameOf(phaseOpts, f.glancePhase)),
                    ...list('Tower', f.towers, r => [
                        ['Name', r.tower], ['Floors', r.floors], ['Units', r.units], ['Parking', r.parking],
                    ]),
                    fld('Selected tower (units)', nameOf(towerOptsFor(f.glancePhase), f.configTower)),
                    ...list('Unit', f.configs, r => [
                        ['Config', nameOf(masters.configurations, r.configuration)],
                        ['Type', nameOf(masters.unitTypes, r.unitType)],
                        ['Floor', nameOf(floorOpts, r.floor) ?? r.floor], // show the floor name, not its id
                        ['Name', r.unitName],
                        ['Saleable', r.saleable],
                        ['Carpet', r.carpet],
                        ['Balcony', r.balcony],
                    ]),
                ],
            },
            {
                step: 3, title: 'Pricing', icon: 'attach-money',
                rows: [
                    fld('Phase', nameOf(phaseOpts, f.pricePhase)),
                    fld('Tower', nameOf(towerOptsFor(f.pricePhase), f.priceTower)),
                    fld('Booking Amount', f.booking),
                    ...list('Price / sq ft', f.prices, r => [['Price', r.price], ['Date', r.date]]),
                    ...list('Floor escalation', f.escalations, r =>
                        f.escMode === 'With Range'
                            ? [['From', r.from], ['To', r.to], ['Rate', r.rate]]
                            : [['Floor', r.from], ['Rate', r.rate]],
                    ),
                    ...list('PLC', f.plcs, r => [
                        ['PLC', nameOf(masters.plcs, r.plc)],
                        ['Unit', nameOf(unitOpts, r.unitId)],
                        ['Amount', r.amount],
                    ]),
                ],
            },
            {
                step: 4, title: 'Timeline', icon: 'event',
                rows: [
                    fld('Project Launch Date', f.launch, true),
                    fld('Expected Possession Date', f.possession, true),
                ],
            },
        ];

        const req = sections.flatMap(sec => sec.rows).filter(r => r.required);
        return {
            sections,
            reqTotal: req.length,
            reqFilled: req.filter(r => r.value).length,
            missing: req.filter(r => !r.value).map(r => r.label),
        };
    };

    const dd = { scrollRef, scrollYRef, kbTopRef };

    // ── STEP 1 ──
    const renderStep1 = () => (
        <>
            {loadFailed.length > 0 && (
                <View style={[styles.infoBanner, { marginHorizontal: 12, marginBottom: 12 }]}>
                    <Icon name="info-outline" size={15} color={COLORS.orange} />
                    <Text style={styles.infoBannerText}>Could not load: {loadFailed.join(', ')}.</Text>
                </View>
            )}
            <Section title="Project Details" icon="business">
                <Row>
                    <DropdownField
                        label="Project *"
                        options={projectOpts}
                        value={form.project}
                        onChange={v => set('project', v)}
                        disabled={isEdit}
                        hint={isEdit ? 'The project cannot be changed while editing.' : 'The location and next steps are saved against this project.'}
                        {...dd}
                    />
                    <TextField
                        label="RERA Registration Number"
                        value={form.rera}
                        onChangeText={v => set('rera', v)}
                        placeholder="Enter RERA registration ID"
                        hint="Applicable to registered projects under local rules."
                    />
                </Row>
                <Row>
                    <DropdownField label="Project Type *" options={typeOpts} value={form.projectType} onChange={v => set('projectType', v)} {...dd} />
                    <DropdownField label="Property Category *" options={categoryOpts} value={form.category} onChange={v => set('category', v)} {...dd} />
                    <DropdownField label="Construction Status" options={masters.statuses} value={form.status} onChange={v => set('status', v)} placeholder="Select status" {...dd} />
                </Row>
            </Section>

            <Section title="Project Overview" icon="description">
                <TextField
                    value={form.overview}
                    onChangeText={v => set('overview', v)}
                    placeholder="Describe the project concept, standout features and its key selling points..."
                    hint="Keep the overview concise. You can add brochures and floor plans later."
                    multiline
                />
            </Section>
        </>
    );

    // ── STEP 2 ──
    const renderStep2 = () => (
        <>
            <Section title="Project Location" icon="location-on">
                <TextField label="Site Address" value={form.address} onChangeText={v => set('address', v)} placeholder="Street, building, area" />
                <Row>
                    <TextField label="Locality / Neighbourhood" value={form.locality} onChangeText={v => set('locality', v)} placeholder="Locality" />
                    <TextField label="Nearby landmark" value={form.landmark} onChangeText={v => set('landmark', v)} placeholder="e.g. Metro station or major road" />
                </Row>
                <Row>
                    <DropdownField label="Country *" options={COUNTRY_OPTS} value={form.country} onChange={pickCountry} {...dd} />
                    {isIndia ? (
                        <DropdownField label="State *" options={stateOpts} value={form.state} onChange={v => set('state', v)} {...dd} />
                    ) : (
                        <TextField label="State / Region *" value={form.state} onChangeText={v => set('state', v)} placeholder="State / Region" />
                    )}
                </Row>
                <Row>
                    {isIndia ? (
                        <DropdownField label="City *" options={cityOpts} value={form.city} onChange={v => set('city', v)} {...dd} />
                    ) : (
                        <TextField label="City *" value={form.cityText} onChangeText={v => set('cityText', v)} placeholder="City" />
                    )}
                    <TextField
                        label={isIndia ? 'PIN code' : 'Postal code'}
                        value={form.pin}
                        onChangeText={v => set('pin', v)}
                        placeholder={isIndia ? 'PIN code' : 'Postal code'}
                        keyboardType={isIndia ? 'number-pad' : 'default'}
                    />
                </Row>
                <TextField label="Google Maps location link" value={form.mapLink} onChangeText={v => set('mapLink', v)} placeholder="Paste Google Maps shareable link" />
            </Section>

            <Section title="Map Placement" icon="map">
                <View style={styles.mapBox}>
                    <Icon name="map" size={30} color={COLORS.accent} />
                    <Text style={styles.mapText}>Map preview</Text>
                </View>
                <Text style={[styles.hint, { textAlign: 'center' }]}>
                    Paste a Google Maps link, or tap the map to drop a pin.
                </Text>
            </Section>
        </>
    );

    // ── STEP 3 ──
    const renderStep3 = () => (
        <>
            <Section title="Phase" icon="layers">
                {form.phases.map((ph, i) => (
                    <RepeatRow
                        key={`ph${i}`}
                        locked={!!ph.id}
                        canRemove={form.phases.length > 1}
                        onRemove={() => removeRow('phases', i)}
                    >
                        <FieldWrap>
                            <TextInput
                                value={ph.name}
                                onChangeText={v => setRow('phases', i, 'name', v)}
                                placeholder="Phase name"
                                placeholderTextColor={COLORS.mutedText}
                                style={styles.input}
                            />
                        </FieldWrap>
                    </RepeatRow>
                ))}
                <View style={styles.actionRow}>
                    <AddMoreBtn onPress={() => addRow('phases', emptyPhase)} />
                    <SubmitSmall label={isEdit ? 'Update' : 'Submit'} loading={busy === 'phases'} onPress={() => run('phases', savePhases)} />
                </View>
            </Section>

            <Section title="Project at a Glance" icon="domain">
                <Row>
                    <DropdownField label="Phase" options={phaseOpts} value={form.glancePhase} onChange={pickGlancePhase} placeholder="Select phase" {...dd} />
                    <View style={{ flex: 1 }} />
                </Row>
                {phaseOpts.length === 0 && (
                    <Text style={styles.hint}>
                        {isEdit ? 'This project has no phases yet. Add one above and press Update.' : 'Submit a phase above to add towers to it.'}
                    </Text>
                )}
                {form.towers.map((t, i) => (
                    <RepeatRow
                        key={`tw${i}`}
                        locked={!!t.id}
                        canRemove={form.towers.length > 1}
                        onRemove={() => removeRow('towers', i)}
                    >
                        <Row>
                            <TextField label="Towers / Blocks" value={t.tower} onChangeText={v => setRow('towers', i, 'tower', v)} placeholder="Tower name" />
                            <TextField label="Total Floors" value={t.floors} onChangeText={v => setRow('towers', i, 'floors', v)} placeholder="0" keyboardType="number-pad" />
                            <TextField label="Total Units" value={t.units} onChangeText={v => setRow('towers', i, 'units', v)} placeholder="0" keyboardType="number-pad" />
                            <TextField label="Parking Slots" value={t.parking} onChangeText={v => setRow('towers', i, 'parking', v)} placeholder="0" keyboardType="number-pad" />
                        </Row>
                    </RepeatRow>
                ))}
                <View style={styles.actionRow}>
                    <AddMoreBtn onPress={() => addRow('towers', emptyTower)} />
                    <SubmitSmall label={isEdit ? 'Update' : 'Submit'} loading={busy === 'towers'} onPress={() => run('towers', saveTowers)} />
                </View>
            </Section>

            <Section title="Available Configurations" icon="home">
                <Row>
                    <DropdownField
                        label="Tower"
                        options={towerOptsFor(form.glancePhase)}
                        value={form.configTower}
                        onChange={id => pickConfigTower(id)}
                        placeholder="Select tower"
                        hint="Towers of the phase selected above."
                        {...dd}
                    />
                    <View style={{ flex: 1 }} />
                </Row>
                {form.configTower && floors.length === 0 && (
                    <Text style={styles.hint}>No floors found for this tower.</Text>
                )}
                {form.configs.map((c, i) => (
                    <RepeatRow
                        key={`cf${i}`}
                        locked={!!c.id}
                        canRemove={form.configs.length > 1}
                        onRemove={() => removeRow('configs', i)}
                    >
                        <View style={styles.subCard}>
                            <Row>
                                <DropdownField label="Configuration" options={masters.configurations} value={c.configuration} onChange={v => setRow('configs', i, 'configuration', v)} {...dd} />
                                <DropdownField label="Unit Type" options={masters.unitTypes} value={c.unitType} onChange={v => setRow('configs', i, 'unitType', v)} {...dd} />
                                <DropdownField label="Floor" options={floorOpts} value={c.floor} onChange={v => setRow('configs', i, 'floor', v)} placeholder="Select floor" {...dd} />
                            </Row>
                            <Row>
                                <TextField label="Unit Name" value={c.unitName} onChangeText={v => setRow('configs', i, 'unitName', v)} placeholder="e.g. 1A" />
                                <TextField label="Saleable Area (sq ft)" value={c.saleable} onChangeText={v => setRow('configs', i, 'saleable', v)} placeholder="Saleable Area" keyboardType="numeric" />
                                <TextField label="Carpet Area (sq ft)" value={c.carpet} onChangeText={v => setRow('configs', i, 'carpet', v)} placeholder="Carpet area" keyboardType="numeric" />
                                <TextField label="Balcony Area (sq ft)" value={c.balcony} onChangeText={v => setRow('configs', i, 'balcony', v)} placeholder="Balcony area" keyboardType="numeric" />
                            </Row>
                        </View>
                    </RepeatRow>
                ))}
                <View style={styles.actionRow}>
                    <AddMoreBtn label="Add Configuration" onPress={() => addRow('configs', emptyConfig)} />
                    <SubmitSmall loading={busy === 'units'} onPress={() => run('units', saveUnits)} />
                </View>
            </Section>
        </>
    );

    // ── STEP 4 ──
    const priceReady = form.pricePhase && form.priceTower;
    const renderStep4 = () => (
        <>
            <Section title="Pricing" icon="attach-money">
                <Row>
                    <DropdownField label="Phase" options={phaseOpts} value={form.pricePhase} onChange={pickPricePhase} placeholder="Select phase" {...dd} />
                    <DropdownField label="Towers / Blocks" options={towerOptsFor(form.pricePhase)} value={form.priceTower} onChange={pickPriceTower} placeholder="Select tower" {...dd} />
                    <TextField label="Booking Amount" value={form.booking} onChangeText={v => set('booking', v)} placeholder="₹5000000" keyboardType="numeric" />
                </Row>
                {!priceReady ? (
                    <View style={styles.infoBanner}>
                        <Icon name="info-outline" size={15} color={COLORS.orange} />
                        <Text style={styles.infoBannerText}>Select a phase and a tower to set its pricing.</Text>
                    </View>
                ) : (
                    <View style={[styles.actionRow, { justifyContent: 'flex-end' }]}>
                        <SubmitSmall label={isEdit ? 'Update' : 'Submit'} loading={busy === 'booking'} onPress={() => run('booking', saveBooking)} />
                    </View>
                )}
            </Section>

            {priceReady ? (
                <>
                    <Section title="Price / sq.ft. (Date-wise)" icon="trending-up">
                        {form.prices.map((p, i) => (
                            <RepeatRow key={`pr${i}`} locked={!!p.id} canRemove={form.prices.length > 1} onRemove={() => removeRow('prices', i)}>
                                <Row>
                                    <TextField value={p.price} onChangeText={v => setRow('prices', i, 'price', v)} placeholder="₹ / sq ft" keyboardType="numeric" />
                                    <DateField value={p.date} onChange={v => setRow('prices', i, 'date', v)} />
                                </Row>
                            </RepeatRow>
                        ))}
                        <View style={styles.actionRow}>
                            <AddMoreBtn onPress={() => addRow('prices', emptyPrice)} />
                            <SubmitSmall label={isEdit ? 'Update' : 'Submit'} loading={busy === 'prices'} onPress={() => run('prices', savePrices)} />
                        </View>
                    </Section>

                    <Section title="Floor Escalation" icon="layers">
                        <Row>
                            <DropdownField label="Type" options={OPT.escalation} value={form.escMode} onChange={v => set('escMode', v)} {...dd} />
                            <View style={{ flex: 1 }} />
                        </Row>
                        {form.escalations.map((e, i) => (
                            <RepeatRow key={`es${i}`} locked={!!e.id} canRemove={form.escalations.length > 1} onRemove={() => removeRow('escalations', i)}>
                                <Row>
                                    <TextField value={e.from} onChangeText={v => setRow('escalations', i, 'from', v)} placeholder={form.escMode === 'With Range' ? 'From floor' : 'Floor number'} keyboardType="number-pad" />
                                    {form.escMode === 'With Range' && (
                                        <TextField value={e.to} onChangeText={v => setRow('escalations', i, 'to', v)} placeholder="To floor" keyboardType="number-pad" />
                                    )}
                                    <TextField value={e.rate} onChangeText={v => setRow('escalations', i, 'rate', v)} placeholder="₹500 / sq ft" keyboardType="numeric" />
                                </Row>
                            </RepeatRow>
                        ))}
                        <View style={styles.actionRow}>
                            <AddMoreBtn onPress={() => addRow('escalations', emptyEsc)} />
                            <SubmitSmall label={isEdit ? 'Update' : 'Submit'} loading={busy === 'esc'} onPress={() => run('esc', saveEscalations)} />
                        </View>
                    </Section>

                    <Section title="PLC" icon="star">
                        {unitOpts.length === 0 && (
                            <Text style={[styles.hint, { marginBottom: 8 }]}>
                                This tower has no units yet. Add units in step 3 to attach a PLC.
                            </Text>
                        )}
                        {form.plcs.map((p, i) => (
                            <RepeatRow key={`pl${i}`} locked={!!p.id} canRemove={form.plcs.length > 1} onRemove={() => removeRow('plcs', i)}>
                                <Row>
                                    <DropdownField options={masters.plcs} value={p.plc} onChange={v => setRow('plcs', i, 'plc', v)} placeholder="PLC" {...dd} />
                                    <DropdownField options={unitOpts} value={p.unitId} onChange={v => setRow('plcs', i, 'unitId', v)} placeholder="Unit" {...dd} />
                                    <TextField value={p.amount} onChangeText={v => setRow('plcs', i, 'amount', v)} placeholder="Amount" keyboardType="numeric" />
                                </Row>
                            </RepeatRow>
                        ))}
                        <View style={styles.actionRow}>
                            <AddMoreBtn onPress={() => addRow('plcs', emptyPlc)} />
                            <SubmitSmall label={isEdit ? 'Update' : 'Submit'} loading={busy === 'plcs'} onPress={() => run('plcs', savePlcs)} />
                        </View>
                    </Section>
                </>
            ) : null}
        </>
    );

    // ── STEP 5 ──
    const renderStep5 = () => (
        <Section title="Key Dates & Ownership" icon="event">
            <Row>
                <DateField label="Project Launch Date" value={form.launch} onChange={v => set('launch', v)} />
                <DateField label="Expected Possession Date" value={form.possession} onChange={v => set('possession', v)} />
            </Row>
        </Section>
    );

    const renderStep = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5][step];

    return (
        <View style={{ flex: 1, backgroundColor: '#1a2d3e' }}>
            <View style={styles.container}>
                <Image source={require('../asset/image/bg-img.png')} style={styles.bgImageFixed} resizeMode="cover" />
                <View style={styles.overlay} />

                <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
                    <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

                    <View style={[styles.topBarContainer, { paddingTop: insets.top + verticalScale(10) }]}>
                        <View style={styles.topBar}>
                            <View style={styles.leftHeader}>
                                <TouchableOpacity
                                    onPress={() => navigation.goBack()}
                                    style={styles.backBtn}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Icon1 name="chevron-back" size={23} color="#fff" />
                                </TouchableOpacity>
                                <Icon name="domain" size={20} color="#ffffff" />
                                <Text style={styles.screenTitle} numberOfLines={1}>{isEdit ? 'Edit Project' : 'Create Project'}</Text>
                            </View>

                            <TouchableOpacity
                                style={styles.previewBtn}
                                onPress={() => {
                                    Keyboard.dismiss();
                                    setPreviewOpen(true);
                                }}
                                activeOpacity={0.75}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Icon name="visibility" size={12} color="#fff" style={{ marginRight: 4 }} />
                                <Text style={styles.previewBtnText}>Preview</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView
                        ref={scrollRef}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        scrollEventThrottle={16}
                        nestedScrollEnabled
                        onScroll={e => {
                            scrollYRef.current = e.nativeEvent.contentOffset.y;
                        }}
                        contentContainerStyle={[
                            { flexGrow: 1, paddingBottom: Math.max(insets.bottom, 0) + 140 + kbHeight },
                            wide && { maxWidth: 980, alignSelf: 'center', width: '100%' },
                        ]}
                    >
                        <View style={styles.progressCard}>
                            <View style={styles.progressTop}>
                                <Text style={styles.progressTitle}>LISTING SETUP</Text>
                                <Text style={styles.progressStep}>Step {step + 1} of 5</Text>
                            </View>
                            <View style={styles.barsRow}>
                                {STEPS.map((_, i) => (
                                    <View key={i} style={[styles.bar, i <= step && styles.barFilled]} />
                                ))}
                            </View>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.stepper}
                            style={{ flexGrow: 0 }}
                        >
                            {STEPS.map((s, i) => {
                                const done = i < step;
                                const active = i === step;
                                return (
                                    <TouchableOpacity
                                        key={s.title}
                                        activeOpacity={0.8}
                                        onPress={() => setStep(i)}
                                        style={[styles.stepChip, active && styles.stepChipActive]}
                                    >
                                        <View style={[styles.stepCircle, done && { backgroundColor: COLORS.green }, active && { backgroundColor: '#fff' }]}>
                                            {done ? (
                                                <Icon name="check" size={12} color="#fff" />
                                            ) : (
                                                <Text style={[styles.stepCircleText, active && { color: COLORS.blue }]}>{i + 1}</Text>
                                            )}
                                        </View>
                                        <Text style={[styles.stepChipText, !active && !done && { opacity: 0.6 }]}>{s.title}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {renderStep()}

                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={goBack} activeOpacity={0.8} disabled={busy === 'next'}>
                                <Text style={styles.cancelText}>{step === 0 ? 'Cancel' : 'Back'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.button} onPress={goNext} activeOpacity={0.8} disabled={busy === 'next'}>
                                {busy === 'next' ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Icon name={isLast ? 'check-circle' : 'arrow-forward'} size={16} color="#fff" />
                                )}
                                <Text style={styles.buttonText}>{isLast ? (isEdit ? 'Update' : 'Submit') : 'Save & Continue'}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </View>

            <PreviewModal
                visible={previewOpen}
                data={previewOpen ? buildPreview() : null}
                onClose={() => setPreviewOpen(false)}
                onGoStep={i => {
                    setPreviewOpen(false);
                    setStep(i);
                }}
            />
            <AppModal config={modal} onClose={closeModal} />
        </View>
    );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a2d3e' },
    bgImageFixed: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: SCREEN_WIDTH,
        height: Dimensions.get('screen').height,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: SCREEN_WIDTH,
        height: Dimensions.get('screen').height,
        backgroundColor: 'rgba(18,32,48,0.72)',
    },
    safeArea: { flex: 1, backgroundColor: 'transparent' },

    topBarContainer: { paddingHorizontal: scale(10), paddingBottom: verticalScale(10) },
    topBar: {
        height: 42,
        borderRadius: scale(22),
        backgroundColor: 'rgba(255,255,255,0.15)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(14),
    },
    leftHeader: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
    backBtn: { paddingRight: 12, justifyContent: 'center', alignItems: 'center' },
    screenTitle: { color: '#ffffff', fontSize: 15, marginLeft: 6, fontWeight: '700', flexShrink: 1 },
    previewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,207,255,0.12)',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderWidth: 1.5,
        borderColor: COLORS.accent,
    },
    previewBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },

    progressCard: {
        backgroundColor: COLORS.cardBg,
        marginHorizontal: 12,
        marginBottom: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    progressTitle: { color: COLORS.gold, fontSize: 12, fontWeight: '700' },
    progressStep: { color: COLORS.orange, fontSize: 11, fontWeight: '700' },
    barsRow: { flexDirection: 'row', gap: 6 },
    bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
    barFilled: { backgroundColor: COLORS.blue },
    stepper: { gap: 8, paddingHorizontal: 12, paddingBottom: 10 },
    stepChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    stepChipActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
    stepChipText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    stepCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepCircleText: { color: '#fff', fontSize: 10, fontWeight: '800' },

    section: {
        backgroundColor: COLORS.cardBg,
        marginHorizontal: 12,
        marginBottom: 12,
        marginTop: 0,
        padding: 14,
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    sectionTitle: { color: COLORS.gold, fontWeight: '700', fontSize: 13 },
    sectionDivider: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 12 },

    inputWrapper: { marginBottom: 10 },
    field: { marginBottom: 10, width: '100%' },
    label: {
        color: '#8a9daf',
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    hint: { color: '#8a9daf', fontSize: 10, marginTop: 4 },
    input: {
        backgroundColor: COLORS.fieldBg,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 40,
        color: '#e6ebf2',
        fontSize: 13,
        borderWidth: 1,
        borderColor: COLORS.fieldBorder,
        paddingVertical: 0,
    },
    inputWithIcon: {
        backgroundColor: COLORS.fieldBg,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: COLORS.fieldBorder,
    },
    textArea: {
        backgroundColor: COLORS.fieldBg,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 80,
        color: '#e6ebf2',
        fontSize: 13,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: COLORS.fieldBorder,
    },

    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#2b3348',
        borderWidth: 1,
        borderColor: '#39415a',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 40,
    },
    dropdownOpen: { borderColor: '#4aa3df', backgroundColor: '#28304a' },
    dropdownMenu: {
        marginTop: LIST_GAP,
        backgroundColor: '#2b3348',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#39415a',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 6,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#323a52',
    },
    dropdownItemActive: { backgroundColor: 'rgba(74,163,223,0.15)' },
    dropdownItemText: { flex: 1, fontSize: 13, color: '#c3cbdb', fontWeight: '500' },
    dropdownItemTextActive: { color: '#7cc4f2', fontWeight: '700' },
    ddTag: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: 'rgba(0,196,140,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(0,196,140,0.45)',
    },
    ddTagText: { color: COLORS.green, fontSize: 10, fontWeight: '700' },
    placeholder: { color: '#8a9daf', fontSize: 13 },
    selectedText: { color: '#e6ebf2', fontSize: 13, fontWeight: '600' },
    ddTriggerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    ddSearchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#39415a',
        backgroundColor: '#28304a',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    ddSearchInput: { flex: 1, fontSize: 13, color: '#e6ebf2', padding: 0 },
    ddNoResult: { textAlign: 'center', color: '#6b7690', fontSize: 12, paddingVertical: 16 },

    subCard: {
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        padding: 10,
        paddingBottom: 0,
    },
    actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    addMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 5,
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(0,207,255,0.5)',
    },
    addMoreText: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
    removeBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: 'rgba(255,107,107,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,107,107,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: 'rgba(0,196,140,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(0,196,140,0.45)',
    },
    submitSmallText: { color: COLORS.green, fontSize: 12, fontWeight: '700' },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,184,93,0.10)',
        borderWidth: 1,
        borderColor: 'rgba(255,184,93,0.35)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    infoBannerText: { color: COLORS.orange, fontSize: 12, flex: 1 },
    mapBox: {
        height: 140,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.fieldBorder,
        backgroundColor: COLORS.fieldBg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        marginBottom: 8,
    },
    mapText: { color: '#8a9daf', fontSize: 12 },

    buttonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 12,
        marginTop: 4,
        gap: 10,
    },
    cancelBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    cancelText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#1e9ce8',
        paddingVertical: 13,
        borderRadius: 24,
    },
    buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    // ── custom modal ──
    mdBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(8,14,24,0.72)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    mdCard: {
        width: '100%',
        maxWidth: 380,
        backgroundColor: COLORS.modalBg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 18,
        alignItems: 'center',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 14,
    },
    mdAccentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
    mdIconWrap: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    mdTitle: { color: '#fff', fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
    mdMessage: { color: '#a9b4c9', fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 20 },
    mdBtnRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 4 },
    mdBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 14,
    },
    mdBtnCancel: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
    },
    mdBtnDanger: {
        backgroundColor: 'rgba(255,107,107,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,107,107,0.45)',
    },
    mdBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    // ── form preview ──
    pvBackdrop: { flex: 1, backgroundColor: 'rgba(8,14,24,0.72)', justifyContent: 'flex-end' },
    pvSheet: {
        maxHeight: '90%',
        backgroundColor: COLORS.modalBg,
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: 0,
    },
    pvHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    pvHeaderTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '800' },
    pvSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.04)',
        marginBottom: 12,
    },
    pvSummaryTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
    pvSummaryText: { color: '#a9b4c9', fontSize: 12, marginTop: 2 },
    pvSection: {
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    pvSectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    pvSectionTitle: { flex: 1, color: COLORS.gold, fontWeight: '700', fontSize: 13 },
    pvEditBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(0,207,255,0.5)',
    },
    pvEditText: { color: COLORS.accent, fontSize: 11, fontWeight: '700' },
    pvRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 6,
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    pvRowMissing: { backgroundColor: 'rgba(255,107,107,0.08)', borderRadius: 8 },
    pvLabel: { color: '#8a9daf', fontSize: 10, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
    pvValue: { color: '#e6ebf2', fontSize: 13, marginTop: 2, lineHeight: 18 },
    pvEmpty: { color: '#6b7690', fontSize: 13, fontStyle: 'italic', marginTop: 2 },
    pvNote: { color: COLORS.orange, fontSize: 11, marginTop: 3 },
    pvSaved: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: 'rgba(0,196,140,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(0,196,140,0.45)',
    },
    pvSavedText: { color: COLORS.green, fontSize: 10, fontWeight: '700' },
    pvCloseBtn: {
        marginHorizontal: 14,
        marginTop: 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.blue,
        paddingVertical: 13,
        borderRadius: 24,
    },
});