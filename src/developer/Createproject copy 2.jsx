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
    useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Icon1 from 'react-native-vector-icons/Ionicons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = size => (SCREEN_WIDTH / 375) * size;
const verticalScale = size => (SCREEN_HEIGHT / 812) * size;
const WIDE_BREAKPOINT = 768;

// keyboard events (iOS "Will" = smoother, Android only has "Did")
const KB_SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const KB_HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

// ─── COLORS (same theme as Add Interaction) ──────────────────────────────────
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

// ─── STEPS & DUMMY OPTIONS ───────────────────────────────────────────────────
const STEPS = [
    { title: 'Project Details', icon: 'info' },
    { title: 'Location', icon: 'location-on' },
    { title: 'Unit Configuration', icon: 'domain' },
    { title: 'Pricing', icon: 'attach-money' },
    { title: 'Timeline', icon: 'event' },
];

const OPT = {
    project: ['abcde', 'Testing..', 'Updates', 'proj-10'],
    projectType: ['Commercial', 'Residential'],
    category: ['Residential', 'Office Space', 'Apartment', 'Villa / Bungalow'],
    status: ['Pre-launch', 'Under Construction', 'Ready to Move', 'Completed'],
    city: ['Kolkata', 'Hydrabaad', 'Mumbai', 'Delhi'],
    state: ['West Bengal', 'Telangana', 'Maharashtra', 'Andaman and Nicobar Islands'],
    country: ['India'],
    configuration: ['1BHK', '2BHK', '3BHK', '4BHK'],
    unitType: ['FLAT-A', 'FLAT-B', 'FLAT-C'],
    floor: ['1', '2', '3', '4', '5'],
    escalation: ['Without Range', 'With Range'],
    plc: ['Park Facing', 'Corner', 'Road Facing'],
    unit: ['Per sq ft', 'Lump sum'],
};

const emptyTower = { tower: '', floors: '', units: '', parking: '' };
const emptyConfig = { configuration: '', unitType: '', floor: '', unitName: '', saleable: '', carpet: '', balcony: '' };
const emptyPrice = { price: '', date: '' };
const emptyEsc = { from: '', to: '', rate: '' };
const emptyPlc = { plc: '', unit: '', amount: '' };

const formatDate = d => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
};

const useWide = () => useWindowDimensions().width >= WIDE_BREAKPOINT;

// ─── LAYOUT HELPERS ──────────────────────────────────────────────────────────
// fields side by side on wide screens, stacked on mobile
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

// ─── TEXT FIELD ──────────────────────────────────────────────────────────────
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

// ─── DATE FIELD ──────────────────────────────────────────────────────────────
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
                    <TouchableOpacity
                        onPress={() => onChange('')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
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

// ─── INLINE DROPDOWN (same behaviour as Add Interaction) ─────────────────────
const ITEM_H = 40;
const SEARCH_H = 42;
const MAX_LIST_H = 220;
const LIST_GAP = 4;
const EXTRA_GAP = 16;
const HEADER_H = 42 + 20;

const DropdownField = ({
    label,
    options = [],
    value,
    onChange,
    hint,
    placeholder,
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

    const filtered = options.filter(o => String(o).toLowerCase().includes(search.toLowerCase()));
    const contentH = filtered.length === 0 ? 48 : filtered.length * ITEM_H;
    const targetH = Math.min(SEARCH_H + contentH, MAX_LIST_H);

    const openRef = useRef(false);
    const targetHRef = useRef(targetH);
    const topInsetRef = useRef(insets.top);
    openRef.current = open;
    targetHRef.current = targetH;
    topInsetRef.current = insets.top;

    // scroll so the whole list sits above the keyboard and below the header
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
        onChange && onChange(item);
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
                style={[styles.dropdown, open && styles.dropdownOpen]}
                onPress={toggle}
                activeOpacity={0.8}
            >
                <View style={styles.ddTriggerLeft}>
                    <Text style={value ? styles.selectedText : styles.placeholder} numberOfLines={1}>
                        {value || placeholder || 'Select'}
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
                                const isActive = item === value;
                                return (
                                    <TouchableOpacity
                                        key={String(item)}
                                        style={[styles.dropdownItem, { height: ITEM_H }, isActive && styles.dropdownItemActive]}
                                        onPress={() => handleSelect(item)}
                                        activeOpacity={0.7}
                                    >
                                        <Text
                                            style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}
                                            numberOfLines={1}
                                        >
                                            {item}
                                        </Text>
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

const SubmitSmall = () => (
    <TouchableOpacity style={styles.submitSmall} activeOpacity={0.85}>
        <Icon name="check" size={14} color={COLORS.green} />
        <Text style={styles.submitSmallText}>Submit</Text>
    </TouchableOpacity>
);

const RepeatRow = ({ children, canRemove, onRemove }) => {
    const wide = useWide();
    return (
        <View style={[{ marginBottom: 4 }, wide && { flexDirection: 'row', alignItems: 'flex-end', gap: 10 }]}>
            <View style={{ flex: 1 }}>{children}</View>
            {canRemove ? (
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
    const insets = useSafeAreaInsets();
    const wide = useWide();

    // one ScrollView ref + scroll position, shared with every dropdown
    const scrollRef = useRef(null);
    const scrollYRef = useRef(0);

    // keyboard state (manual, same on Android + iOS)
    const [kbHeight, setKbHeight] = useState(0);
    const kbTopRef = useRef(null);

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
    const [form, setForm] = useState({
        project: '', rera: '', projectType: '', category: '', status: '', overview: '',
        address: '', locality: '', landmark: '', city: '', state: '', pin: '', country: 'India', mapLink: '',
        phases: [''],
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

    const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
    const setRow = (key, idx, field, val) =>
        setForm(p => ({
            ...p,
            [key]: p[key].map((r, i) => (i === idx ? (typeof r === 'string' ? val : { ...r, [field]: val }) : r)),
        }));
    const addRow = (key, empty) =>
        setForm(p => ({ ...p, [key]: [...p[key], typeof empty === 'object' ? { ...empty } : empty] }));
    const removeRow = (key, idx) => setForm(p => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }));

    const isLast = step === STEPS.length - 1;
    const goNext = () => (isLast ? navigation.goBack() : setStep(s => s + 1));
    const goBack = () => (step === 0 ? navigation.goBack() : setStep(s => s - 1));

    const phaseNames = form.phases.filter(Boolean);
    const towerNames = form.towers.map(t => t.tower).filter(Boolean);

    // shared props for every dropdown
    const dd = { scrollRef, scrollYRef, kbTopRef };

    // ── STEP 1 ──
    const renderStep1 = () => (
        <>
            <Section title="Project Details" icon="business">
                <Row>
                    <DropdownField
                        label="Project *"
                        options={OPT.project}
                        value={form.project}
                        onChange={v => set('project', v)}
                        hint="The location and next steps are saved against this project."
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
                    <DropdownField label="Project Type *" options={OPT.projectType} value={form.projectType} onChange={v => set('projectType', v)} {...dd} />
                    <DropdownField label="Property Category *" options={OPT.category} value={form.category} onChange={v => set('category', v)} {...dd} />
                    <DropdownField label="Construction Status" options={OPT.status} value={form.status} onChange={v => set('status', v)} placeholder="Select status" {...dd} />
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
                    <DropdownField label="City *" options={OPT.city} value={form.city} onChange={v => set('city', v)} {...dd} />
                    <DropdownField label="State *" options={OPT.state} value={form.state} onChange={v => set('state', v)} {...dd} />
                </Row>
                <Row>
                    <TextField label="PIN code" value={form.pin} onChangeText={v => set('pin', v)} placeholder="PIN code" keyboardType="number-pad" />
                    <DropdownField label="Country" options={OPT.country} value={form.country} onChange={v => set('country', v)} {...dd} />
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
                    <RepeatRow key={`ph${i}`} canRemove={form.phases.length > 1} onRemove={() => removeRow('phases', i)}>
                        <FieldWrap>
                            <TextInput
                                value={ph}
                                onChangeText={v => setRow('phases', i, null, v)}
                                placeholder="Phase name"
                                placeholderTextColor={COLORS.mutedText}
                                style={styles.input}
                            />
                        </FieldWrap>
                    </RepeatRow>
                ))}
                <View style={styles.actionRow}>
                    <AddMoreBtn onPress={() => addRow('phases', '')} />
                    <SubmitSmall />
                </View>
            </Section>

            <Section title="Project at a Glance" icon="domain">
                <Row>
                    <DropdownField label="Phase" options={phaseNames} value={form.glancePhase} onChange={v => set('glancePhase', v)} placeholder="Select phase" {...dd} />
                    <View style={{ flex: 1 }} />
                </Row>
                {form.towers.map((t, i) => (
                    <RepeatRow key={`tw${i}`} canRemove={form.towers.length > 1} onRemove={() => removeRow('towers', i)}>
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
                    <SubmitSmall />
                </View>
            </Section>

            <Section title="Available Configurations" icon="home">
                <Row>
                    <DropdownField label="Tower" options={towerNames} value={form.configTower} onChange={v => set('configTower', v)} placeholder="Select tower" {...dd} />
                    <View style={{ flex: 1 }} />
                </Row>
                {form.configs.map((c, i) => (
                    <RepeatRow key={`cf${i}`} canRemove={form.configs.length > 1} onRemove={() => removeRow('configs', i)}>
                        <View style={styles.subCard}>
                            <Row>
                                <DropdownField label="Configuration" options={OPT.configuration} value={c.configuration} onChange={v => setRow('configs', i, 'configuration', v)} {...dd} />
                                <DropdownField label="Unit Type" options={OPT.unitType} value={c.unitType} onChange={v => setRow('configs', i, 'unitType', v)} {...dd} />
                                <DropdownField label="Floor" options={OPT.floor} value={c.floor} onChange={v => setRow('configs', i, 'floor', v)} {...dd} />
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
                    <SubmitSmall />
                </View>
            </Section>
        </>
    );

    // ── STEP 4 ──
    const renderStep4 = () => (
        <>
            <Section title="Pricing" icon="attach-money">
                <Row>
                    <DropdownField label="Phase" options={phaseNames} value={form.pricePhase} onChange={v => set('pricePhase', v)} placeholder="Select phase" {...dd} />
                    <DropdownField label="Towers / Blocks" options={towerNames} value={form.priceTower} onChange={v => set('priceTower', v)} placeholder="Select tower" {...dd} />
                    <TextField label="Booking Amount" value={form.booking} onChangeText={v => set('booking', v)} placeholder="₹5000000" keyboardType="numeric" />
                </Row>
                {!form.pricePhase || !form.priceTower ? (
                    <View style={styles.infoBanner}>
                        <Icon name="info-outline" size={15} color={COLORS.orange} />
                        <Text style={styles.infoBannerText}>Select a phase and a tower to set its pricing.</Text>
                    </View>
                ) : null}
            </Section>

            {form.pricePhase && form.priceTower ? (
                <>
                    <Section title="Price / sq.ft. (Date-wise)" icon="trending-up">
                        {form.prices.map((p, i) => (
                            <RepeatRow key={`pr${i}`} canRemove={form.prices.length > 1} onRemove={() => removeRow('prices', i)}>
                                <Row>
                                    <TextField value={p.price} onChangeText={v => setRow('prices', i, 'price', v)} placeholder="₹ / sq ft" keyboardType="numeric" />
                                    <DateField value={p.date} onChange={v => setRow('prices', i, 'date', v)} />
                                </Row>
                            </RepeatRow>
                        ))}
                        <AddMoreBtn onPress={() => addRow('prices', emptyPrice)} />
                    </Section>

                    <Section title="Floor Escalation" icon="layers">
                        <Row>
                            <DropdownField label="Type" options={OPT.escalation} value={form.escMode} onChange={v => set('escMode', v)} {...dd} />
                            <View style={{ flex: 1 }} />
                        </Row>
                        {form.escalations.map((e, i) => (
                            <RepeatRow key={`es${i}`} canRemove={form.escalations.length > 1} onRemove={() => removeRow('escalations', i)}>
                                <Row>
                                    <TextField value={e.from} onChangeText={v => setRow('escalations', i, 'from', v)} placeholder={form.escMode === 'With Range' ? 'From floor' : 'Floor number'} keyboardType="number-pad" />
                                    {form.escMode === 'With Range' && (
                                        <TextField value={e.to} onChangeText={v => setRow('escalations', i, 'to', v)} placeholder="To floor" keyboardType="number-pad" />
                                    )}
                                    <TextField value={e.rate} onChangeText={v => setRow('escalations', i, 'rate', v)} placeholder="₹500 / sq ft" keyboardType="numeric" />
                                </Row>
                            </RepeatRow>
                        ))}
                        <AddMoreBtn onPress={() => addRow('escalations', emptyEsc)} />
                    </Section>

                    <Section title="PLC" icon="star">
                        {form.plcs.map((p, i) => (
                            <RepeatRow key={`pl${i}`} canRemove={form.plcs.length > 1} onRemove={() => removeRow('plcs', i)}>
                                <Row>
                                    <DropdownField options={OPT.plc} value={p.plc} onChange={v => setRow('plcs', i, 'plc', v)} placeholder="PLC" {...dd} />
                                    <DropdownField options={OPT.unit} value={p.unit} onChange={v => setRow('plcs', i, 'unit', v)} placeholder="Unit" {...dd} />
                                    <TextField value={p.amount} onChangeText={v => setRow('plcs', i, 'amount', v)} placeholder="Amount" keyboardType="numeric" />
                                </Row>
                            </RepeatRow>
                        ))}
                        <AddMoreBtn onPress={() => addRow('plcs', emptyPlc)} />
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

                    {/* TOP BAR */}
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
                                <Text style={styles.screenTitle} numberOfLines={1}>Create Project</Text>
                            </View>

                            <TouchableOpacity
                                style={styles.previewBtn}
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
                        {/* Listing setup progress */}
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

                        {/* Step chips */}
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

                        {/* Step content (section cards) */}
                        {renderStep()}

                        {/* Buttons */}
                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={goBack} activeOpacity={0.8}>
                                <Text style={styles.cancelText}>{step === 0 ? 'Cancel' : 'Back'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.button} onPress={goNext} activeOpacity={0.8}>
                                <Icon name={isLast ? 'check-circle' : 'arrow-forward'} size={16} color="#fff" />
                                <Text style={styles.buttonText}>{isLast ? 'Submit' : 'Save & Continue'}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </View>
        </View>
    );
}

// ─── STYLES (Add Interaction theme) ──────────────────────────────────────────
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

    /* ── Header pill ── */
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

    // ── Progress + step chips ──
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

    // ── Section card ──
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

    // ── Fields ──
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

    // ── Inline dropdown ──
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

    // ── Repeat rows / small buttons ──
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

    // ── Buttons ──
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
});