import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Image,
    StatusBar,
    Dimensions,
    useWindowDimensions,
    ActivityIndicator,
    RefreshControl,
    Modal,
    Alert,
    DeviceEventEmitter,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Icon1 from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import api from '../api/AxiosInstance'; // <-- adjust to wherever your axios instance file lives

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('screen').height;
const scale = size => (SCREEN_WIDTH / 375) * size;
const verticalScale = size => (Dimensions.get('window').height / 812) * size;
const WIDE_BREAKPOINT = 768;

// ─── API ─────────────────────────────────────────────────────────────────────
// baseURL and the Bearer token (PM_TOKEN) are handled by the shared axios instance
const ENDPOINTS = {
    details: '/api/pm/getAllPropertyProjectDetails', // GET ?page=1&search=aaa
    updateStatus: id => `/api/pm/updateConstructionStatus/${id}`, // PUT { construction_status: "1" } — id = details id
};

// ─── COLORS ──────────────────────────────────────────────────────────────────
const COLORS = {
    white: '#FFFFFF',
    muted: '#9aa8bd',
    orange: '#FFB85D',
    accent: '#00cfff',
    green: '#2ec14e',
    red: '#e05252',
    border: 'rgba(255,255,255,0.22)',
    glass: 'rgba(255,255,255,0.15)',
    cardBg: 'rgba(4,35,70,0.62)',
    rowBg: 'rgba(4,20,40,0.55)',
    headBg: '#0b5a8f',
};

// Backend status ids → labels. Edit labels to match your backend (5 is a placeholder).
const STATUS_BY_ID = {
    1: 'Pre-launch',
    2: 'New-launch',
    3: 'Under Construction',
    4: 'Ready to Move',
    5: 'Completed',
};
const STATUS_OPTIONS = Object.values(STATUS_BY_ID);
const STATUS_IDS = Object.fromEntries(
    Object.entries(STATUS_BY_ID).map(([id, label]) => [label, Number(id)]),
);
const STATUS_COLORS = {
    'Pre-launch': '#7b4fa3',
    'Under Construction': '#f0a04b',
    'Ready to Move': '#17a2b8',
    Completed: '#1e9e3a',
    'On Hold': '#e05252',
};
const STATUS_FILTERS = ['All', ...STATUS_OPTIONS];

const COLUMNS = [
    { key: 'name', label: 'Project Name', w: 170 },
    { key: 'type', label: 'Project Type', w: 130 },
    { key: 'category', label: 'Property Category', w: 160 },
    { key: 'location', label: 'Location', w: 130 },
    { key: 'status', label: 'Construction Status', w: 200 },
    { key: 'amount', label: 'Booking Amount', w: 140 },
    { key: 'launch', label: 'Launch Date', w: 130 },
    { key: 'possession', label: 'Expected Possession', w: 160 },
    { key: 'actions', label: 'Actions', w: 110 },
];
const TABLE_W = COLUMNS.reduce((s, c) => s + c.w, 0);
const colW = key => COLUMNS.find(c => c.key === key).w;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const show = v => (v !== null && v !== undefined && v !== '' && v !== '-' ? v : '—');

const formatDate = value => {
    if (!value) return '-';
    const s = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-');
        return `${d}-${m}-${y}`;
    }
    const d = new Date(s);
    if (isNaN(d.getTime())) return '-';
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

const money = v => {
    const n = Number(v);
    return v === null || v === undefined || v === '' || isNaN(n) ? '-' : `₹${n.toLocaleString('en-IN')}`;
};

const normalize = d => {
    const proj = d.propertyproject || {};
    const locs = proj.propertylocationdetails || [];
    const prices = proj.propertyprojectpricings || [];
    const times = proj.propertyprojecttimelines || [];
    return {
        id: d.id, // details id (used for status update and the edit form)
        projectId: d.project_id,
        name: proj.project_name || '-',
        rera: d.rera_registration_number || '',
        type: d.propertyprojecttype?.property_project_type_name || '-',
        category: d.propertyprojectcategorytype?.property_project_category_type_name || '-',
        typeId: d.project_type_id, // ids used to prefill the edit form
        categoryId: d.project_category_id,
        statusId: d.construction_status,
        overview: d.project_overview || '',
        status: STATUS_BY_ID[Number(d.construction_status)] ?? null,
        location: locs[0]?.propertylocation?.name || '-',
        locations: locs,
        pricings: prices,
        timelines: times,
        amount: money(prices[0]?.booking_amount),
        launch: formatDate(times[0]?.project_launch_date),
        possession: formatDate(times[0]?.expected_possession_date),
        active: d.active === '1',
        createdAt: d.created_at,
        updatedAt: d.updated_at,
    };
};

// ─── SMALL STAT CHIP ─────────────────────────────────────────────────────────
const StatChip = ({ item }) => (
    <View style={styles.statChip}>
        <View style={[styles.statIconWrap, { backgroundColor: item.color + '28' }]}>
            <Icon name={item.icon} size={16} color={item.color} />
        </View>
        <View>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statTitle}>{item.title}</Text>
        </View>
    </View>
);

// ─── STATUS BADGE (tap to change) ────────────────────────────────────────────
const StatusBadge = ({ status, onPress, saving }) => {
    const c = STATUS_COLORS[status] || COLORS.muted;
    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            disabled={saving}
            style={[styles.statusBadge, { backgroundColor: c + '33', borderColor: c }]}
        >
            {saving ? (
                <ActivityIndicator size="small" color="#fff" style={{ transform: [{ scale: 0.6 }] }} />
            ) : (
                <View style={[styles.statusDot, { backgroundColor: c }]} />
            )}
            <Text style={[styles.statusBadgeText, { color: '#fff' }]} numberOfLines={1}>
                {status || 'Set status'}
            </Text>
            <Icon name="keyboard-arrow-down" size={14} color="#fff" />
        </TouchableOpacity>
    );
};

// ─── MOBILE PROJECT CARD ─────────────────────────────────────────────────────
const InfoCol = ({ label, value }) => (
    <View style={styles.infoCol}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{show(value)}</Text>
    </View>
);

const ProjectCard = ({ item, onView, onChangeStatus }) => {
    const accent = STATUS_COLORS[item.status] || COLORS.muted;
    return (
        <View style={styles.card}>
            <View style={[styles.cardAccent, { backgroundColor: accent }]} />

            <View style={styles.cardTop}>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                <StatusBadge status={item.status} saving={item.savingStatus} onPress={() => onChangeStatus(item)} />
            </View>
            <Text style={styles.cardSub} numberOfLines={1}>
                Project #{item.projectId}{item.rera ? `  ·  RERA ${item.rera}` : ''}
            </Text>

            <View style={styles.tagRow}>
                <View style={styles.tag}>
                    <Icon name="location-on" size={11} color={COLORS.orange} />
                    <Text style={styles.tagText}>{show(item.location)}</Text>
                </View>
                <View style={styles.tag}>
                    <MaterialCommunityIcons name="office-building-outline" size={11} color={COLORS.accent} />
                    <Text style={styles.tagText}>{show(item.type)}</Text>
                </View>
                {item.category !== '-' && (
                    <View style={styles.tag}>
                        <MaterialCommunityIcons name="home-city-outline" size={11} color={COLORS.accent} />
                        <Text style={styles.tagText}>{item.category}</Text>
                    </View>
                )}
            </View>

            <View style={styles.divider} />

            <View style={styles.cardBottom}>
                <InfoCol label="Booking" value={item.amount} />
                <InfoCol label="Launch" value={item.launch} />
                <InfoCol label="Possession" value={item.possession} />
                <TouchableOpacity activeOpacity={0.85} style={styles.viewBtn} onPress={() => onView(item)}>
                    <Text style={styles.viewBtnText}>View</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ─── WIDE-SCREEN TABLE ───────────────────────────────────────────────────────
const TableHeader = () => (
    <View style={styles.tHeader}>
        {COLUMNS.map(c => (
            <Text key={c.key} numberOfLines={1} style={[styles.tHeadText, styles.tCell, { width: c.w }]}>
                {c.label}
            </Text>
        ))}
    </View>
);

const TableRow = ({ item, onView, onChangeStatus }) => {
    const txt = (key, value) => (
        <View style={[styles.tCell, { width: colW(key) }]}>
            <Text numberOfLines={1} style={styles.tText}>{show(value)}</Text>
        </View>
    );
    return (
        <View style={styles.tRow}>
            {txt('name', item.name)}
            {txt('type', item.type)}
            {txt('category', item.category)}
            {txt('location', item.location)}
            <View style={[styles.tCell, { width: colW('status') }]}>
                <StatusBadge status={item.status} saving={item.savingStatus} onPress={() => onChangeStatus(item)} />
            </View>
            {txt('amount', item.amount)}
            {txt('launch', item.launch)}
            {txt('possession', item.possession)}
            <View style={[styles.tCell, { width: colW('actions') }]}>
                <TouchableOpacity activeOpacity={0.85} style={styles.viewBtn} onPress={() => onView(item)}>
                    <Text style={styles.viewBtnText}>View</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ─── STATUS PICKER ───────────────────────────────────────────────────────────
const StatusPicker = ({ item, onClose, onSelect }) => {
    const insets = useSafeAreaInsets();
    if (!item) return null;
    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.pBackdrop}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                <View style={[styles.pSheet, { marginBottom: insets.bottom + 16 }]}>
                    <Text style={styles.pTitle}>Construction Status</Text>
                    <Text style={styles.pSub} numberOfLines={1}>{item.name}</Text>
                    {STATUS_OPTIONS.map(s => {
                        const c = STATUS_COLORS[s];
                        const active = item.status === s;
                        return (
                            <TouchableOpacity
                                key={s}
                                activeOpacity={0.8}
                                onPress={() => onSelect(item, s)}
                                style={[styles.pOption, active && { borderColor: c, backgroundColor: c + '22' }]}
                            >
                                <View style={[styles.statusDot, { backgroundColor: c, width: 9, height: 9, borderRadius: 5 }]} />
                                <Text style={styles.pOptionText}>{s}</Text>
                                {active && <Icon name="check" size={18} color={c} />}
                            </TouchableOpacity>
                        );
                    })}
                    <TouchableOpacity onPress={onClose} style={styles.pCancel} activeOpacity={0.8}>
                        <Text style={styles.pCancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// ─── DETAIL / PREVIEW MODAL ──────────────────────────────────────────────────
// Shows every field of the project: filled ones with their value, blank ones as "Not filled".
const has = v => v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '-';
const fld = (label, value, required, note) => ({
    label,
    value: has(value) ? String(value).trim() : '',
    required: !!required,
    note: note || '',
});

const buildSections = item => {
    const sections = [];

    sections.push({
        title: 'Project Details',
        icon: 'business',
        rows: [
            fld('Project', item.name, true),
            fld('RERA Registration Number', item.rera),
            fld('Project Type', item.type, true),
            fld('Property Category', item.category, true),
            fld('Construction Status', item.status),
            fld('Project Overview', item.overview),
        ],
    });

    // one block of rows per saved site location (or one empty block when none)
    const locs = item.locations.length ? item.locations : [{}];
    const multi = locs.length > 1;
    sections.push({
        title: 'Location',
        icon: 'location-on',
        rows: locs.flatMap((l, i) => {
            const sfx = multi ? ` ${i + 1}` : '';
            return [
                fld(`Site Address${sfx}`, l.site_address),
                fld(`Locality / Neighbourhood${sfx}`, l.neighbourhood_details),
                fld(`Nearby landmark${sfx}`, l.nearby_landmark),
                fld(`Country${sfx}`, l.country, true),
                fld(`State${sfx}`, l.state, true),
                fld(`City${sfx}`, l.propertylocation?.name, true),
                fld(`PIN / Postal code${sfx}`, l.pin_code),
                fld(`Google Maps link${sfx}`, l.map_location_link),
            ];
        }),
    });

    const prices = item.pricings.length ? item.pricings : [{}];
    sections.push({
        title: 'Pricing',
        icon: 'attach-money',
        rows: prices.map((p, i) =>
            fld(
                prices.length > 1 ? `Booking Amount ${i + 1}` : 'Booking Amount',
                has(p.booking_amount) ? money(p.booking_amount) : '',
                true,
                p.phase_id || p.block_id ? `Phase #${p.phase_id ?? '—'}  ·  Block #${p.block_id ?? '—'}` : '',
            ),
        ),
    });

    const times = item.timelines.length ? item.timelines : [{}];
    sections.push({
        title: 'Timeline',
        icon: 'event',
        rows: times.flatMap((t, i) => {
            const sfx = times.length > 1 ? ` ${i + 1}` : '';
            return [
                fld(`Project Launch Date${sfx}`, has(t.project_launch_date) ? formatDate(t.project_launch_date) : '', true),
                fld(`Expected Possession Date${sfx}`, has(t.expected_possession_date) ? formatDate(t.expected_possession_date) : '', true),
            ];
        }),
    });

    const req = sections.flatMap(s => s.rows).filter(r => r.required);
    return {
        sections,
        reqTotal: req.length,
        reqFilled: req.filter(r => r.value).length,
        missing: req.filter(r => !r.value).map(r => r.label),
    };
};

const DetailModal = ({ item, onClose, onSelectStatus, onEdit }) => {
    const insets = useSafeAreaInsets();
    if (!item) return null;
    const accent = STATUS_COLORS[item.status] || COLORS.muted;
    const { sections, reqTotal, reqFilled, missing } = buildSections(item);
    const allDone = missing.length === 0;

    return (
        <Modal visible transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.mBackdrop}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                <View style={[styles.mSheet, { paddingBottom: insets.bottom + 16 }]}>
                    <View style={styles.mHandle} />

                    <View style={styles.mHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.mTitle} numberOfLines={2}>{item.name}</Text>
                            <Text style={styles.mSub}>
                                Project #{item.projectId}  ·  Details #{item.id}  ·  Updated {formatDate(item.updatedAt)}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Icon name="close" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.mBadges}>
                        <View style={[styles.statusBadge, { backgroundColor: (item.active ? COLORS.green : COLORS.red) + '33', borderColor: item.active ? COLORS.green : COLORS.red }]}>
                            <View style={[styles.statusDot, { backgroundColor: item.active ? COLORS.green : COLORS.red }]} />
                            <Text style={[styles.statusBadgeText, { color: '#fff' }]}>{item.active ? 'Active' : 'Inactive'}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: accent + '33', borderColor: accent }]}>
                            <View style={[styles.statusDot, { backgroundColor: accent }]} />
                            <Text style={[styles.statusBadgeText, { color: '#fff' }]}>{item.status || 'No status'}</Text>
                        </View>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
                        {/* Summary: how complete is this project */}
                        <View style={[styles.pvSummary, { borderColor: allDone ? 'rgba(46,193,78,0.5)' : 'rgba(224,82,82,0.5)' }]}>
                            <Icon name={allDone ? 'check-circle' : 'error-outline'} size={22} color={allDone ? COLORS.green : COLORS.red} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.pvSummaryTitle}>
                                    {allDone ? 'All required fields are filled' : `${reqFilled} of ${reqTotal} required fields filled`}
                                </Text>
                                {!allDone && <Text style={styles.pvSummaryText}>Missing: {missing.join(', ')}</Text>}
                            </View>
                        </View>

                        {/* Change construction status */}
                        <View style={styles.pvSection}>
                            <View style={styles.pvSectionHead}>
                                <MaterialCommunityIcons name="hammer-wrench" size={14} color={COLORS.accent} />
                                <Text style={styles.pvSectionTitle}>Construction Status</Text>
                            </View>
                            <View style={styles.tagRow}>
                                {STATUS_OPTIONS.map(s => {
                                    const c = STATUS_COLORS[s];
                                    const active = item.status === s;
                                    return (
                                        <TouchableOpacity
                                            key={s}
                                            activeOpacity={0.8}
                                            disabled={item.savingStatus}
                                            onPress={() => onSelectStatus(item, s)}
                                            style={[styles.chip, active && { backgroundColor: c, borderColor: c }]}
                                        >
                                            <Text style={[styles.chipText, active && { color: '#fff', fontWeight: '700' }]}>{s}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Filled / blank fields */}
                        {sections.map(sec => (
                            <View key={sec.title} style={styles.pvSection}>
                                <View style={styles.pvSectionHead}>
                                    <Icon name={sec.icon} size={14} color={COLORS.accent} />
                                    <Text style={styles.pvSectionTitle}>{sec.title}</Text>
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
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                        <View style={{ height: 6 }} />
                    </ScrollView>

                    <TouchableOpacity style={styles.mEditBtn} activeOpacity={0.85} onPress={() => onEdit(item)}>
                        <Icon name="edit" size={16} color="#1a1a1a" />
                        <Text style={styles.mEditText}>{allDone ? 'Edit project' : 'Fill missing details'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
const DeveloperProject = () => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const isWide = width >= WIDE_BREAKPOINT;

    const [items, setItems] = useState([]);
    const [pager, setPager] = useState({ page: 1, pages: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [allItems, setAllItems] = useState([]); // every record (no search) — used only for stat chips

    const [search, setSearch] = useState('');
    const [query, setQuery] = useState(''); // debounced search sent to the API
    const [statusFilter, setStatusFilter] = useState('All');

    const [selected, setSelected] = useState(null);
    const [pickerItem, setPickerItem] = useState(null);

    // Debounce the search box → API `search` param
    useEffect(() => {
        const t = setTimeout(() => setQuery(search.trim()), 400);
        return () => clearTimeout(t);
    }, [search]);

    const fetchPage = useCallback(
        async (pageNum, mode = 'initial') => {
            try {
                if (mode === 'more') setLoadingMore(true);
                else if (mode === 'refresh') setRefreshing(true);
                else setLoading(true);
                setError(null);

                const res = await api.get(ENDPOINTS.details, {
                    params: { page: pageNum, ...(query ? { search: query } : {}) },
                });
                const body = res.data;
                if (body?.success === false || body?.status === false) {
                    throw new Error(body?.message || 'Failed to load projects');
                }

                const rows = (body.data || []).map(normalize);
                setItems(prev => (pageNum === 1 ? rows : [...prev, ...rows]));
                setPager({
                    page: body.pagination?.currentPage ?? pageNum,
                    pages: body.pagination?.totalPages ?? 1,
                    total: body.pagination?.totalRecords ?? rows.length,
                });
            } catch (e) {
                setError(e?.response?.data?.message || e?.message || 'Something went wrong');
            } finally {
                setLoading(false);
                setRefreshing(false);
                setLoadingMore(false);
            }
        },
        [query],
    );

    // Reload from page 1 whenever the (debounced) search changes
    useEffect(() => {
        fetchPage(1, 'initial');
    }, [fetchPage]);

    // Load every page (ignoring search) so the stat chips count the whole dataset
    const loadAllForStats = useCallback(async () => {
        try {
            let page = 1;
            let pages = 1;
            let all = [];
            do {
                const res = await api.get(ENDPOINTS.details, { params: { page } });
                const body = res.data;
                all = all.concat((body?.data || []).map(normalize));
                pages = body?.pagination?.totalPages ?? 1;
                page += 1;
            } while (page <= pages && page <= 50);
            setAllItems(all);
        } catch (e) {
            // stat chips fall back to the loaded rows
        }
    }, []);

    useEffect(() => {
        loadAllForStats();
    }, [loadAllForStats]);

    // CreateProject emits this after a project is created / updated: reload the list
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('projectSubmitted', () => {
            fetchPage(1, 'refresh');
            loadAllForStats();
        });
        return () => sub.remove();
    }, [fetchPage, loadAllForStats]);

    const patchItem = (id, patch) => {
        const apply = prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p));
        setItems(apply);
        setAllItems(apply);
    };

    const changeStatus = useCallback(async (item, newStatus) => {
        setPickerItem(null);
        if (item.status === newStatus) return;
        const previous = item.status;

        patchItem(item.id, { status: newStatus, savingStatus: true }); // optimistic
        try {
            const res = await api.put(ENDPOINTS.updateStatus(item.id), {
                construction_status: String(STATUS_IDS[newStatus]), // "1"–"5"
            });
            if (res?.data?.status === false || res?.data?.success === false) {
                throw new Error(res.data.message || 'Update failed');
            }
            patchItem(item.id, { savingStatus: false });
        } catch (e) {
            patchItem(item.id, { status: previous, savingStatus: false }); // rollback
            Alert.alert(
                'Could not update status',
                e?.response?.data?.message || e?.message || 'Please try again.',
            );
        }
    }, []);

    // open the edit form: CreateProject reads route.params.editItem and fills every step from it
    const editProject = useCallback(
        item => {
            setSelected(null);
            navigation.push('CreateProject', { projectId: item.projectId, editItem: item });
        },
        [navigation],
    );

    // Stats: counted from the full dataset (all pages, no search), not just the visible rows
    const stats = useMemo(() => {
        const src = allItems.length ? allItems : items;
        const t = p => p.type.trim().toLowerCase();
        return [
            { key: 'total', title: 'Total', value: allItems.length || pager.total, icon: 'description', color: '#a678d4' },
            { key: 'res', title: 'Residential', value: src.filter(p => t(p).startsWith('resid')).length, icon: 'home', color: '#1e9ce8' },
            { key: 'com', title: 'Commercial', value: src.filter(p => t(p).startsWith('comm')).length, icon: 'apartment', color: '#f0a04b' },
            { key: 'done', title: 'Completed', value: src.filter(p => p.status === 'Completed').length, icon: 'check-circle', color: '#2ec14e' },
        ];
    }, [allItems, items, pager.total]);

    const filtered = useMemo(
        () => items.filter(p => statusFilter === 'All' || p.status === statusFilter),
        [items, statusFilter],
    );

    const showList = !loading && !error;

    return (
        <View style={styles.container}>
            <Image
                source={require('../asset/image/bg-img.png')}
                style={styles.bgImage}
                resizeMode="cover"
            />
            <View style={styles.overlay} />
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

            {/* Top bar */}
            <View style={[styles.topBarContainer, { paddingTop: insets.top + verticalScale(10) }]}>
                <View style={styles.topBar}>
                    <View style={styles.leftHeader}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Icon1 name="chevron-back" size={23} color="#fff" />
                        </TouchableOpacity>
                        <MaterialCommunityIcons name="file-document-edit-outline" size={20} color="#fff" />
                        <Text style={styles.screenTitle} numberOfLines={1}>Projects</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.createBtn}
                        onPress={() => navigation.navigate('CreateProject')}
                        activeOpacity={0.75}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Text style={styles.createBtnText}>Create</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            fetchPage(1, 'refresh');
                            loadAllForStats();
                        }}
                        tintColor={COLORS.accent}
                        colors={[COLORS.accent]}
                    />
                }
            >
                {/* Stat chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
                    {stats.map(s => (
                        <StatChip key={s.key} item={s} />
                    ))}
                </ScrollView>

                {/* Search (server-side) */}
                <View style={styles.searchBox}>
                    <Icon name="search" size={17} color={COLORS.muted} />
                    <TextInput
                        placeholder="Search by project"
                        placeholderTextColor={COLORS.muted}
                        value={search}
                        onChangeText={setSearch}
                        style={styles.searchInput}
                    />
                    {search ? (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Icon name="close" size={16} color={COLORS.muted} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Status filter chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                    {STATUS_FILTERS.map(s => {
                        const active = statusFilter === s;
                        const c = STATUS_COLORS[s] || COLORS.accent;
                        return (
                            <TouchableOpacity
                                key={s}
                                activeOpacity={0.8}
                                onPress={() => setStatusFilter(s)}
                                style={[styles.chip, active && { backgroundColor: c, borderColor: c }]}
                            >
                                <Text style={[styles.chipText, active && { color: '#fff', fontWeight: '700' }]}>{s}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {showList && (
                    <Text style={styles.entriesText}>
                        Showing {filtered.length} of {pager.total} entries
                    </Text>
                )}

                {loading && <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 30 }} />}

                {!!error && !loading && (
                    <TouchableOpacity onPress={() => fetchPage(1, 'initial')} style={styles.emptyWrap} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={36} color={COLORS.orange} />
                        <Text style={styles.emptyText}>{error}</Text>
                        <Text style={[styles.emptyText, { color: COLORS.accent }]}>Tap to retry</Text>
                    </TouchableOpacity>
                )}

                {showList &&
                    (isWide ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ width: Math.max(TABLE_W, width - 24) }}>
                                <TableHeader />
                                {filtered.map(item => (
                                    <TableRow key={item.id} item={item} onView={setSelected} onChangeStatus={setPickerItem} />
                                ))}
                            </View>
                        </ScrollView>
                    ) : (
                        filtered.map(item => (
                            <ProjectCard key={item.id} item={item} onView={setSelected} onChangeStatus={setPickerItem} />
                        ))
                    ))}

                {showList && filtered.length === 0 && (
                    <View style={styles.emptyWrap}>
                        <MaterialCommunityIcons name="folder-search-outline" size={36} color={COLORS.muted} />
                        <Text style={styles.emptyText}>No projects found</Text>
                    </View>
                )}

                {/* Pagination */}
                {showList && pager.page < pager.pages && (
                    <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.moreBtn}
                        onPress={() => fetchPage(pager.page + 1, 'more')}
                        disabled={loadingMore}
                    >
                        {loadingMore ? (
                            <ActivityIndicator color="#1a1a1a" size="small" />
                        ) : (
                            <Text style={styles.moreBtnText}>Load more</Text>
                        )}
                    </TouchableOpacity>
                )}
            </ScrollView>

            <DetailModal
                item={items.find(p => p.id === selected?.id) || null}
                onClose={() => setSelected(null)}
                onSelectStatus={changeStatus}
                onEdit={editProject}
            />
            <StatusPicker
                item={items.find(p => p.id === pickerItem?.id) || null}
                onClose={() => setPickerItem(null)}
                onSelect={changeStatus}
            />
        </View>
    );
};

export default DeveloperProject;

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a2d3e' },
    bgImage: { position: 'absolute', top: 0, left: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
    overlay: {
        position: 'absolute', top: 0, left: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT,
        backgroundColor: 'rgba(18,32,48,0.72)',
    },

    // ── Top bar ──
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
    screenTitle: { color: '#ffffff', fontSize: 17, marginLeft: 6, fontWeight: '700', flexShrink: 1 },
    createBtn: {
        backgroundColor: 'rgba(0,207,255,0.12)',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderWidth: 1.5,
        borderColor: COLORS.accent,
    },
    createBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '600' },

    // ── Stat chips ──
    statsRow: { gap: 8, paddingVertical: 4, marginBottom: 8 },
    statChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 7,
        minWidth: 96,
    },
    statIconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    statValue: { color: '#fff', fontSize: 16, fontWeight: '800', lineHeight: 18 },
    statTitle: { color: COLORS.orange, fontSize: 9.5, fontWeight: '600' },

    // ── Search + filters ──
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: 'rgba(255,255,255,0.07)',
        paddingHorizontal: 12,
        marginBottom: 8,
        maxWidth: 420,
    },
    searchInput: { flex: 1, color: '#fff', fontSize: 13, marginLeft: 8, paddingVertical: 0 },
    chipsRow: { gap: 6, paddingBottom: 8 },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    chipText: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '500' },
    entriesText: { color: COLORS.muted, fontSize: 11, marginBottom: 8, marginLeft: 2 },

    // ── Project card (mobile) ──
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 14,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 10,
        paddingLeft: 14,
        paddingRight: 12,
        marginBottom: 10,
        overflow: 'hidden',
    },
    cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    cardName: { color: '#fff', fontSize: 14, fontWeight: '800', flex: 1 },
    cardSub: { color: COLORS.muted, fontSize: 10.5, marginTop: 2 },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 2,
        flexShrink: 0,
        alignSelf: 'flex-start',
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusBadgeText: { fontSize: 10, fontWeight: '700' },

    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 10,
        paddingHorizontal: 7,
        paddingVertical: 2,
        maxWidth: '60%',
    },
    tagText: { color: 'rgba(255,255,255,0.85)', fontSize: 10.5 },

    divider: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.14)', marginVertical: 9 },
    cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoCol: { flex: 1, minWidth: 0 },
    infoLabel: { color: COLORS.muted, fontSize: 9.5, marginBottom: 1 },
    infoValue: { color: '#fff', fontSize: 11.5, fontWeight: '700' },

    viewBtn: {
        backgroundColor: COLORS.orange,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 5,
        alignSelf: 'center',
    },
    viewBtnText: { color: '#1a1a1a', fontSize: 11.5, fontWeight: '700' },

    // ── Table (wide) ──
    tHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.headBg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        marginBottom: 8,
    },
    tHeadText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    tRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 46,
        borderRadius: 23,
        backgroundColor: COLORS.rowBg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
        marginBottom: 8,
    },
    tCell: { paddingHorizontal: 14, justifyContent: 'center' },
    tText: { color: '#fff', fontSize: 12, fontWeight: '600' },

    // ── Load more ──
    moreBtn: {
        alignSelf: 'center',
        backgroundColor: COLORS.orange,
        borderRadius: 18,
        paddingHorizontal: 28,
        paddingVertical: 8,
        marginTop: 6,
        minWidth: 120,
        alignItems: 'center',
    },
    moreBtnText: { color: '#1a1a1a', fontSize: 12, fontWeight: '700' },

    // ── Status picker ──
    pBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end', paddingHorizontal: 14 },
    pSheet: {
        backgroundColor: '#12283d',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        padding: 16,
    },
    pTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
    pSub: { color: COLORS.muted, fontSize: 11.5, marginTop: 2, marginBottom: 10 },
    pOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        marginBottom: 8,
    },
    pOptionText: { color: '#fff', fontSize: 13.5, fontWeight: '600', flex: 1 },
    pCancel: { alignItems: 'center', paddingVertical: 10, marginTop: 2 },
    pCancelText: { color: COLORS.muted, fontSize: 13, fontWeight: '600' },

    // ── Detail / preview modal ──
    mBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    mSheet: {
        maxHeight: '90%',
        backgroundColor: '#12283d',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 18,
        paddingTop: 10,
    },
    mHandle: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginBottom: 12,
    },
    mHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    mTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
    mSub: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
    mBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    mEditBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: COLORS.orange,
        borderRadius: 24,
        paddingVertical: 12,
        marginTop: 10,
    },
    mEditText: { color: '#1a1a1a', fontSize: 13.5, fontWeight: '800' },

    // preview rows (filled / not filled)
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
    pvSectionTitle: { flex: 1, color: COLORS.orange, fontWeight: '800', fontSize: 13 },
    pvRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 6,
        borderTopWidth: 0.5,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    pvRowMissing: { backgroundColor: 'rgba(224,82,82,0.10)', borderRadius: 8 },
    pvLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
    pvValue: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 2, lineHeight: 18 },
    pvEmpty: { color: '#6b7690', fontSize: 13, fontStyle: 'italic', marginTop: 2 },
    pvNote: { color: COLORS.muted, fontSize: 11, marginTop: 3 },

    // ── Empty / error ──
    emptyWrap: { alignItems: 'center', marginTop: 30, gap: 6 },
    emptyText: { color: COLORS.muted, fontSize: 13 },
});