import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  DeviceEventEmitter,
  Dimensions,
  Image,
  Keyboard,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Icon1 from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {pick, types, isErrorWithCode, errorCodes} from '@react-native-documents/picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import api from '../api/AxiosInstance';

const {height: SCREEN_HEIGHT, width: SCREEN_WIDTH} = Dimensions.get('window');
const scale = size => (SCREEN_WIDTH / 375) * size;
const verticalScale = size => (SCREEN_HEIGHT / 812) * size;

// keyboard events (iOS "Will" = smoother, Android only has "Did")
const KB_SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const KB_HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

/* ------------------------------------------------------------------ */
/* Settings: replace the sample options / endpoint with your own        */
/* ------------------------------------------------------------------ */
const SUBMIT_URL = '/api/pm/createPropertyBooking';
const RM_URL = '/api/pm/getAllRm'; // TODO: put your real "all RM" endpoint here

// static options (values are exactly what the API expects)
const MARITAL = [
  {label: 'SINGLE', value: 'single'},
  {label: 'MARRIED', value: 'married'},
  {label: 'UNMARRIED', value: 'unmarried'},
];
const LOAN = [
  {label: 'Yes', value: 'yes'},
  {label: 'No', value: 'no'},
];

// ─── COLORS (same theme as Rmform / Leads List) ──────────────────────
const COLORS = {
  accent: '#00cfff',
  white: '#FFFFFF',
  mutedText: '#8A90B4',
  gold: '#f4c542',
  red: '#FF6B6B',
  cardBg: '#ffffff0e',
  modalBg: '#21283a',
  fieldBg: '#2b3348',
  fieldBorder: '#39415a',
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const pad2 = n => String(n).padStart(2, '0');
const toISO = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fmtDate = iso => {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${d}-${m}-${y}` : '';
};
const parseISO = iso => {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return isNaN(dt.getTime()) ? null : dt;
};
const fmtSize = b =>
  b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INITIAL = {
  bookingDate: '',
  project: null,
  location: null,
  primaryName: '',
  secondaryName: '',
  address: '',
  mobile: '',
  email: '',
  dob: '',
  occupation: '',
  gender: '',
  marital: null,
  officeLocation: '',
  industry: '',
  loan: null,
  flatType: '',
  flatNo: '',
  towerNo: '',
  floor: '',
  carpet: '',
  saleable: '',
  agreementValue: '',
  baseBrokeragePct: '',
  baseBrokerageRs: '',
  ladderBrokeragePct: '',
  ladderBrokerageRs: '',
  source: null,
  salesManager: '',
  rm: null,
};

// Builds the starting form. When opened from a site-visit card ("Book" button)
// the lead's details are already filled in (ids come straight from the lead).
const buildInitial = (p = {}) => ({
  ...INITIAL,
  bookingDate: toISO(new Date()),
  primaryName: p.name || '',
  mobile: String(p.phone || '').replace(/\D/g, '').slice(-10),
  email: p.email || '',
  project: p.projectId ?? null,
  location: p.locationId ?? null,
  rm: p.rmId ?? null,
  source: p.sourceId ?? null,
});

const REQUIRED = {
  bookingDate: 'Date of booking',
  project: 'Project',
  location: 'Property location',
  primaryName: 'Applicant name',
  address: 'Address',
  mobile: 'Mobile number',
  email: 'Email',
  dob: 'Date of birth',
  occupation: 'Occupation',
  gender: 'Gender',
  marital: 'Marital status',
  officeLocation: 'Office location',
  industry: 'Industry',
  loan: 'Loan requirement',
  flatType: 'Flat type',
  flatNo: 'Flat no',
  towerNo: 'Tower no',
  floor: 'Floor',
  carpet: 'Carpet area',
  saleable: 'Saleable area',
  agreementValue: 'Agreement value',
  baseBrokerageRs: 'Base brokerage',
  ladderBrokerageRs: 'Ladder brokerage',
  source: 'Source',
  salesManager: 'Sales manager',
  rm: 'Relationship manager',
};

const FILES = [
  {key: 'agreement', label: 'Agreement', required: false},
  {key: 'booking_form', label: 'Booking Form', required: true},
  {key: 'cost_sheet', label: 'Cost Sheet', required: true},
  {key: 'pan_card', label: 'Pan Card', required: false},
  {key: 'aadhar_card', label: 'Aadhar Card', required: false},
  {key: 'others', label: 'Others', required: false},
];

/* ------------------------------------------------------------------ */
/* Small pieces (Rmform style)                                          */
/* ------------------------------------------------------------------ */
const ErrorText = ({msg}) =>
  msg ? (
    <View style={styles.errorRow}>
      <Icon name="error-outline" size={12} color="#ff6b6b" />
      <Text style={styles.errorText}>{msg}</Text>
    </View>
  ) : null;

const Section = ({title, icon, children}) => (
  <View style={styles.section}>
    <View style={styles.sectionTitleRow}>
      <Icon name={icon || 'info'} size={14} color={COLORS.accent} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionDivider} />
    {children}
  </View>
);

// Label + children + error
const Field = ({label, required, error, children, style}) => (
  <View style={[styles.inputWrapper, style]}>
    <Text
      style={styles.label}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}>
      {label}
      {required ? ' *' : ''}
    </Text>
    {children}
    <ErrorText msg={error} />
  </View>
);

const Row = ({children}) => <View style={styles.rowHalf}>{children}</View>;

const InputBox = ({error, disabled, style, ...props}) => (
  <TextInput
    {...props}
    editable={!disabled}
    placeholderTextColor={COLORS.mutedText}
    style={[
      styles.input,
      error && styles.inputError,
      disabled && styles.inputDisabled,
      style,
    ]}
  />
);

/* ---------- Inline dropdown (same as Rmform) ---------- */
const LIST_HEIGHT = 220;
const LIST_GAP = 4;
const EXTRA_GAP = 16;

const DropdownField = ({
  label,
  required,
  data,
  value,
  onChange,
  error,
  scrollRef,
  scrollYRef,
  kbTopRef,
  placeholder,
}) => {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropAnim = useRef(new Animated.Value(0)).current;
  const triggerRef = useRef(null);

  const options = data || [];
  const selected = options.find(o => o.value === value);
  const filtered = options.filter(o =>
    String(o.label ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const maxHeight = dropAnim.interpolate({inputRange: [0, 1], outputRange: [0, LIST_HEIGHT]});

  const openRef = useRef(false);
  const topInsetRef = useRef(insets.top);
  openRef.current = open;
  topInsetRef.current = insets.top;

  // scroll so the whole list sits above the keyboard and below the header
  const ensureListVisible = kbTop => {
    if (!triggerRef.current || !scrollRef?.current) return;

    const run = viewTop => {
      if (!triggerRef.current) return;
      triggerRef.current.measureInWindow((x, y, w, h) => {
        const visibleBottom = kbTop || kbTopRef?.current || SCREEN_HEIGHT;
        const listBottom = y + h + LIST_GAP + LIST_HEIGHT + EXTRA_GAP;

        let delta = 0;
        if (listBottom > visibleBottom) delta = listBottom - visibleBottom;

        const minTop = viewTop + 24;
        if (y - delta < minTop) delta = y - minTop;

        if (delta > 1) {
          scrollRef.current?.scrollTo({
            y: (scrollYRef?.current || 0) + delta,
            animated: true,
          });
        }
      });
    };

    if (typeof scrollRef.current.measureInWindow === 'function') {
      scrollRef.current.measureInWindow((x, vy) => run(vy || 0));
    } else {
      run(topInsetRef.current + 60);
    }
  };

  const close = (duration = 180) => {
    Keyboard.dismiss();
    Animated.timing(dropAnim, {toValue: 0, duration, useNativeDriver: false}).start(() => {
      setOpen(false);
      setSearch('');
      DeviceEventEmitter.emit('toggleBottomNav', true);
    });
  };

  const toggle = () => {
    if (open) {
      close();
    } else {
      DeviceEventEmitter.emit('toggleBottomNav', false);
      setOpen(true);
      Animated.timing(dropAnim, {toValue: 1, duration: 200, useNativeDriver: false}).start(
        ({finished}) => {
          if (finished) ensureListVisible();
        },
      );
    }
  };

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

  const handleSelect = item => {
    onChange && onChange(item.value);
    close(150);
  };

  return (
    <View collapsable={false} style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? ' *' : ''}
      </Text>

      <TouchableOpacity
        ref={triggerRef}
        collapsable={false}
        style={[
          styles.dropdown,
          open && styles.dropdownOpen,
          error && styles.inputError,
          {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
        ]}
        onPress={toggle}
        activeOpacity={0.8}>
        <View style={styles.ddTriggerLeft}>
          <Text style={selected ? styles.selectedText : styles.placeholder} numberOfLines={1}>
            {selected ? selected.label : placeholder || 'Select...'}
          </Text>
        </View>
        <Icon
          name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={20}
          color={COLORS.accent}
        />
      </TouchableOpacity>

      {open && (
        <Animated.View style={[styles.dropdownMenu, {maxHeight, opacity: dropAnim}]}>
          <View style={styles.ddSearchWrap}>
            <Icon name="search" size={16} color={COLORS.accent} style={{marginRight: 6}} />
            <TextInput
              style={styles.ddSearchInput}
              placeholder="Search..."
              placeholderTextColor={COLORS.mutedText}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="done"
              blurOnSubmit
              underlineColorAndroid="transparent"
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch('')}
                hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
                <Icon name="close" size={14} color={COLORS.mutedText} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            style={{maxHeight: 155}}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled>
            {filtered.length === 0 ? (
              <Text style={styles.ddNoResult}>No results found</Text>
            ) : (
              filtered.map(item => {
                const isActive = item.value === value;
                return (
                  <TouchableOpacity
                    key={String(item.value)}
                    style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}>
                    <Text
                      style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}
                      numberOfLines={1}>
                      {item.label}
                    </Text>
                    {isActive && <Icon name="check-circle" size={16} color={COLORS.accent} />}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </Animated.View>
      )}

      <ErrorText msg={error} />
    </View>
  );
};

/* ---------- Date field (native picker, like Rmform) ---------- */
const DateField = ({label, required, value, onChange, error}) => {
  const [show, setShow] = useState(false);
  const date = parseISO(value);

  const handleChange = (event, selectedDate) => {
    setShow(false);
    if (event?.type === 'dismissed') return;
    if (selectedDate) onChange(toISO(selectedDate));
  };

  return (
    <Field label={label} required={required} error={error}>
      <TouchableOpacity
        style={[styles.inputWithIcon, error && styles.inputError]}
        activeOpacity={0.8}
        onPress={() => {
          Keyboard.dismiss();
          setShow(true);
        }}>
        <Text style={{color: date ? '#e6ebf2' : COLORS.mutedText, fontSize: 13}}>
          {date ? fmtDate(value) : 'dd-mm-yyyy'}
        </Text>
        {date ? (
          <TouchableOpacity
            onPress={() => onChange('')}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Icon name="close" size={20} color="#ff5252" />
          </TouchableOpacity>
        ) : (
          <Icon name="calendar-today" size={18} color={COLORS.accent} />
        )}
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={date || new Date()}
          mode="date"
          display="default"
          onChange={handleChange}
          maximumDate={new Date()}
        />
      )}
    </Field>
  );
};

/* ---------- Gender (radio, like Rmform) ---------- */
const GenderField = ({value, onChange, error}) => (
  <Field label="Gender" required error={error}>
    <View style={styles.genderRow}>
      {[
        {label: 'Male', v: '1'},
        {label: 'Female', v: '2'},
      ].map(g => (
        <TouchableOpacity key={g.v} style={styles.radioContainer} onPress={() => onChange(g.v)}>
          <View style={[styles.radio, String(value) === g.v && styles.radioActive]} />
          <Text style={styles.radioText}>{g.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </Field>
);

/* ---------- File upload ---------- */
const FileField = ({label, required, file, onChange, error}) => {
  const choose = async () => {
    try {
      const [res] = await pick({
        type: [types.pdf, types.images],
        allowMultiSelection: false,
      });
      onChange({
        uri: res.uri,
        name: res.name || 'file',
        type: res.type || 'application/octet-stream',
        size: res.size || 0,
      });
    } catch (e) {
      const cancelled = isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED;
      if (!cancelled) Alert.alert('Could not pick file', 'Please try again.');
    }
  };

  return (
    <Field label={label} required={required} error={error}>
      {file ? (
        <View style={styles.fileChip}>
          <View style={styles.fileIcon}>
            <Icon
              name={String(file.type).startsWith('image') ? 'image' : 'picture-as-pdf'}
              size={20}
              color={COLORS.accent}
            />
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.fileName} numberOfLines={1}>
              {file.name}
            </Text>
            {file.size ? <Text style={styles.fileSize}>{fmtSize(file.size)}</Text> : null}
          </View>
          <TouchableOpacity hitSlop={10} onPress={choose} style={styles.fileAction}>
            <Icon name="swap-horiz" size={18} color={COLORS.mutedText} />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={10} onPress={() => onChange(null)} style={styles.fileAction}>
            <Icon name="close" size={18} color={COLORS.red} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={choose}
          style={[styles.upload, error && styles.inputError]}>
          <Icon name="upload-file" size={20} color={COLORS.accent} />
          <Text style={styles.uploadText}>Choose file</Text>
          <Text style={styles.uploadHint}>PDF or image</Text>
        </TouchableOpacity>
      )}
    </Field>
  );
};

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */
export default function BookingFormScreen({route}) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = route?.params || {};
  const leadId = params.leadId;
  const queryClient = useQueryClient();

  // dropdown data from the API (same endpoints as the Add Lead screen)
  const {data: projectData} = useQuery({
    queryKey: ['bookingProjects'],
    queryFn: async () => (await api.get('/api/pm/getAllPropertyProjects'))?.data?.data,
  });
  const {data: locationData} = useQuery({
    queryKey: ['bookingLocations'],
    queryFn: async () => (await api.get('/api/pm/getAllPropertyLocation'))?.data?.data,
  });
  const {data: sourceData} = useQuery({
    queryKey: ['bookingSources'],
    queryFn: async () => (await api.get('/api/pm/getAllMrReferences'))?.data?.data,
  });
  const {data: rmData} = useQuery({
    queryKey: ['bookingRms'],
    queryFn: async () => (await api.get(RM_URL))?.data?.data,
  });

  const projectOptions = (projectData || []).map(i => ({label: i.project_name, value: i.id}));
  const locationOptions = (locationData || []).map(i => ({label: i.name, value: i.id}));
  const sourceOptions = (sourceData || []).map(i => ({label: i.mrf_name, value: i.id}));
  let rmOptions = (rmData || []).map(i => ({label: i.name || i.rm_name || i.username, value: i.id}));
  if (!rmOptions.length && params.rmId != null) {
    rmOptions = [{label: params.rmName || `RM #${params.rmId}`, value: params.rmId}];
  }

  const initialRef = useRef(buildInitial(params));
  const [form, setForm] = useState(initialRef.current);
  const [files, setFiles] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [slab, setSlab] = useState(null); // brokerage slab returned by the API
  const [slabStatus, setSlabStatus] = useState('idle'); // idle | loading | ok | error

  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);

  // keyboard state (manual, for both Android and iOS)
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

  const set = useCallback(
    key => v => {
      setForm(f => ({...f, [key]: v}));
      setErrors(e => (e[key] ? {...e, [key]: undefined} : e));
    },
    [],
  );
  // ── brokerage: % and Rs. are linked through the agreement value ──
  const toNum = v => parseFloat(String(v ?? '').replace(/,/g, ''));
  const round2 = n => String(Math.round(n * 100) / 100);
  const calcRs = (agreement, pct) => {
    const a = toNum(agreement);
    const p = toNum(pct);
    return isNaN(a) || isNaN(p) ? '' : round2((a * p) / 100);
  };
  const calcPct = (agreement, rs) => {
    const a = toNum(agreement);
    const r = toNum(rs);
    return isNaN(a) || isNaN(r) || a === 0 ? '' : round2((r / a) * 100);
  };
  const onAgreementChange = v => {
    setForm(f => ({
      ...f,
      agreementValue: v,
      baseBrokerageRs: f.baseBrokeragePct ? calcRs(v, f.baseBrokeragePct) : f.baseBrokerageRs,
      ladderBrokerageRs: f.ladderBrokeragePct
        ? calcRs(v, f.ladderBrokeragePct)
        : f.ladderBrokerageRs,
    }));
    setErrors(e => ({...e, agreementValue: undefined}));
  };
  const onPctChange = (pctKey, rsKey) => v => {
    setForm(f => ({...f, [pctKey]: v, [rsKey]: calcRs(f.agreementValue, v)}));
    setErrors(e => ({...e, [rsKey]: undefined}));
  };
  const onRsChange = (pctKey, rsKey) => v => {
    setForm(f => ({...f, [rsKey]: v, [pctKey]: calcPct(f.agreementValue, v)}));
    setErrors(e => ({...e, [rsKey]: undefined}));
  };

  // ── load the brokerage slab whenever the project changes ──
  // 1) how many units are already booked in this project
  // 2) the slab for the unit number of THIS booking (booked + 1)
  useEffect(() => {
    if (!form.project) {
      setSlab(null);
      setSlabStatus('idle');
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setSlabStatus('loading');
      setForm(f => ({
        ...f,
        baseBrokeragePct: '',
        baseBrokerageRs: '',
        ladderBrokeragePct: '',
        ladderBrokerageRs: '',
      }));
      try {
        const t = await api.get(`/api/pm/getTotalBookingUnitsByProjectById/${form.project}`);
        const units = (Number(t?.data?.data) || 0) + 1;
        const r = await api.post('/api/pm/getBrokerageDataByUnitsAndProjectId', {
          project_id: form.project,
          unit: units,
        });
        const d = r?.data?.data;
        if (cancelled) return;
        if (!d) throw new Error('No brokerage slab found');
        const basic = round2(toNum(d.basic_percentage) || 0);
        const extra = round2(toNum(d.additional_percentage) || 0);
        setSlab({...d, units, basic, extra});
        setForm(f => ({
          ...f,
          baseBrokeragePct: basic,
          ladderBrokeragePct: extra,
          baseBrokerageRs: calcRs(f.agreementValue, basic),
          ladderBrokerageRs: calcRs(f.agreementValue, extra),
        }));
        setSlabStatus('ok');
      } catch (e) {
        if (cancelled) return;
        setSlab(null);
        setSlabStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.project]);

  const setFile = key => f => {
    setFiles(p => ({...p, [key]: f}));
    setErrors(e => (e[key] ? {...e, [key]: undefined} : e));
  };

  const validate = () => {
    const e = {};
    Object.keys(REQUIRED).forEach(k => {
      const v = form[k];
      if (v === null || v === undefined || String(v).trim() === '') {
        e[k] = `${REQUIRED[k]} is required`;
      }
    });
    if (!e.mobile && !/^\d{10}$/.test(form.mobile.trim())) {
      e.mobile = 'Enter a valid 10-digit mobile number';
    }
    if (!e.email && !EMAIL_RE.test(form.email.trim())) {
      e.email = 'Enter a valid email address';
    }
    FILES.forEach(f => {
      if (f.required && !files[f.key]) e[f.key] = `${f.label} is required`;
    });
    setErrors(e);
    return e;
  };

  const submit = async () => {
    Keyboard.dismiss();
    const e = validate();
    if (Object.keys(e).length) {
      Alert.alert(
        '⚠️ Incomplete Form',
        'Please fill in all required fields correctly before submitting.',
        [{text: 'OK', style: 'default'}],
      );
      return;
    }
    try {
      setSubmitting(true);
      const body = new FormData();
      const payload = {
        date_of_booking: form.bookingDate,
        project_id: form.project,
        location: form.location,
        name: form.primaryName.trim(),
        alternative_name: form.secondaryName.trim(),
        address: form.address.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        date_of_birth: form.dob,
        gender: form.gender,
        marital_status: form.marital,
        office_location: form.officeLocation.trim(),
        industry: form.industry.trim(),
        occupation: form.occupation.trim(),
        loan_requirement: form.loan,
        flat_type: form.flatType.trim(),
        flat_number: form.flatNo.trim(),
        tower_no: form.towerNo.trim(),
        floor: form.floor.trim(),
        carpet_area: form.carpet.trim(),
        saleable_area: form.saleable.trim(),
        agreement_value: form.agreementValue.trim(),
        source: form.source,
        base_brokerage: form.baseBrokerageRs.trim(),
        ladder_brokerage: form.ladderBrokerageRs.trim(),
        base_brokerage_percentage: form.baseBrokeragePct,
        additonal_brokerage_percentage: form.ladderBrokeragePct, // (sic) spelling matches the API
        sales_manager: form.salesManager.trim(),
        rm_id: form.rm,
        property_lead_id: leadId,
      };
      Object.keys(payload).forEach(k => body.append(k, String(payload[k] ?? '')));
      FILES.forEach(f => {
        if (files[f.key]) {
          body.append(f.key, {
            uri: files[f.key].uri,
            name: files[f.key].name,
            type: files[f.key].type,
          });
        }
      });
      const res = await api.post(SUBMIT_URL, body, {
        headers: {'Content-Type': 'multipart/form-data'},
      });
      if (res?.data?.status === false) {
        Alert.alert('❌ Submission Failed', res.data.message || 'Something went wrong.', [
          {text: 'OK', style: 'cancel'},
        ]);
        return;
      }
      queryClient.invalidateQueries({
        predicate: q =>
          ['TotalLead', 'SiteVisitandBookingsData', 'AllPropertyLeads', 'dashboardCards'].includes(
            q.queryKey[0],
          ),
      });
      Alert.alert(
        '✅ Booking Created',
        'The booking was saved successfully.',
        [{text: 'OK', onPress: () => navigation.goBack()}],
        {cancelable: false},
      );
    } catch (err) {
      const msg =
        err?.response?.data?.message || 'Please check your connection and try again.';
      Alert.alert('❌ Could not create booking', msg, [{text: 'OK', style: 'cancel'}]);
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    const dirty =
      JSON.stringify(form) !== JSON.stringify(initialRef.current) ||
      Object.keys(files).length > 0;
    if (!dirty) {
      navigation.goBack();
      return;
    }
    Alert.alert('Discard booking?', 'Your entered details will be lost.', [
      {text: 'Keep editing', style: 'cancel'},
      {text: 'Discard', style: 'destructive', onPress: () => navigation.goBack()},
    ]);
  };

  const ddShared = {scrollRef, scrollYRef, kbTopRef};

  return (
    <View style={{flex: 1, backgroundColor: '#1a2d3e'}}>
      <View style={styles.container}>
        <Image
          source={require('../asset/image/bg-img.png')}
          style={styles.bgImageFixed}
          resizeMode="cover"
        />
        <View style={styles.overlay} />
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        {/* TOP BAR */}
        <View style={[styles.topBarContainer, {paddingTop: insets.top + verticalScale(10)}]}>
          <View style={styles.topBar}>
            <View style={styles.leftHeader}>
              <TouchableOpacity
                onPress={cancel}
                style={styles.backBtn}
                activeOpacity={0.7}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Icon1 name="chevron-back" size={23} color="#fff" />
              </TouchableOpacity>
              <Icon name="apartment" size={20} color="#ffffff" />
              <Text style={styles.screenTitle} numberOfLines={1}>
                {params.name ? `New Booking · ${params.name}` : 'New Booking'}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          onScroll={e => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 0) + 120 + kbHeight,
          }}>
          {/* 1. Applicant */}
          <Section title="Applicant Details" icon="person">
            <DateField
              label="Date of Booking"
              required
              value={form.bookingDate}
              onChange={set('bookingDate')}
              error={errors.bookingDate}
            />
            <DropdownField
              label="Project"
              required
              placeholder="Select Project"
              data={projectOptions}
              value={form.project}
              onChange={set('project')}
              error={errors.project}
              {...ddShared}
            />
            <DropdownField
              label="Property Location"
              required
              placeholder="Select Location"
              data={locationOptions}
              value={form.location}
              onChange={set('location')}
              error={errors.location}
              {...ddShared}
            />
            <Field label="Primary Applicant's Name" required error={errors.primaryName}>
              <InputBox
                value={form.primaryName}
                onChangeText={set('primaryName')}
                placeholder="Full name"
                autoCapitalize="words"
                error={errors.primaryName}
              />
            </Field>
            <Field label="Secondary Applicant's Name">
              <InputBox
                value={form.secondaryName}
                onChangeText={set('secondaryName')}
                placeholder="Optional"
                autoCapitalize="words"
              />
            </Field>
            <Field label="Address" required error={errors.address}>
              <InputBox
                value={form.address}
                onChangeText={set('address')}
                placeholder="Full address"
                multiline
                style={styles.multiline}
                textAlignVertical="top"
                error={errors.address}
              />
            </Field>
            <Field label="Mobile No" required error={errors.mobile}>
              <InputBox
                value={form.mobile}
                onChangeText={v => set('mobile')(v.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter 10-digit mobile number"
                keyboardType="number-pad"
                maxLength={10}
                error={errors.mobile}
              />
            </Field>
            <Field label="Email ID" required error={errors.email}>
              <InputBox
                value={form.email}
                onChangeText={set('email')}
                placeholder="Enter Email Address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.email}
              />
            </Field>
            <DateField
              label="Date of Birth"
              required
              value={form.dob}
              onChange={set('dob')}
              error={errors.dob}
            />
            <Field label="Occupation" required error={errors.occupation}>
              <InputBox
                value={form.occupation}
                onChangeText={set('occupation')}
                placeholder="e.g. Engineer"
                error={errors.occupation}
              />
            </Field>
            <GenderField value={form.gender} onChange={set('gender')} error={errors.gender} />
            <DropdownField
              label="Marital Status"
              required
              placeholder="Select Marital Status"
              data={MARITAL}
              value={form.marital}
              onChange={set('marital')}
              error={errors.marital}
              {...ddShared}
            />
            <Field label="Office Location" required error={errors.officeLocation}>
              <InputBox
                value={form.officeLocation}
                onChangeText={set('officeLocation')}
                placeholder="Office City / Area"
                error={errors.officeLocation}
              />
            </Field>
            <Field label="Industry" required error={errors.industry}>
              <InputBox
                value={form.industry}
                onChangeText={set('industry')}
                placeholder="e.g. IT, Banking"
                error={errors.industry}
              />
            </Field>
          </Section>

          {/* 2. Booking */}
          <Section title="Booking Details" icon="apartment">
            <DropdownField
              label="Loan Requirement"
              required
              placeholder="Select"
              data={LOAN}
              value={form.loan}
              onChange={set('loan')}
              error={errors.loan}
              {...ddShared}
            />
            <Field label="Flat Type" required error={errors.flatType}>
              <InputBox
                value={form.flatType}
                onChangeText={set('flatType')}
                placeholder="e.g. 2 BHK"
                error={errors.flatType}
              />
            </Field>
            <Row>
              <Field label="Flat No" required error={errors.flatNo} style={styles.half}>
                <InputBox
                  value={form.flatNo}
                  onChangeText={set('flatNo')}
                  error={errors.flatNo}
                />
              </Field>
              <Field label="Tower No" required error={errors.towerNo} style={styles.half}>
                <InputBox
                  value={form.towerNo}
                  onChangeText={set('towerNo')}
                  error={errors.towerNo}
                />
              </Field>
            </Row>
            <Field label="Floor" required error={errors.floor}>
              <InputBox
                value={form.floor}
                onChangeText={set('floor')}
                keyboardType="number-pad"
                error={errors.floor}
              />
            </Field>
            <Row>
              <Field label="Carpet Area" required error={errors.carpet} style={styles.half}>
                <InputBox
                  value={form.carpet}
                  onChangeText={set('carpet')}
                  keyboardType="decimal-pad"
                  placeholder="sq ft"
                  error={errors.carpet}
                />
              </Field>
              <Field label="Saleable Area" required error={errors.saleable} style={styles.half}>
                <InputBox
                  value={form.saleable}
                  onChangeText={set('saleable')}
                  keyboardType="decimal-pad"
                  placeholder="sq ft"
                  error={errors.saleable}
                />
              </Field>
            </Row>
            <Field label="Agreement Value" required error={errors.agreementValue}>
              <InputBox
                value={form.agreementValue}
                onChangeText={onAgreementChange}
                keyboardType="decimal-pad"
                placeholder="₹"
                error={errors.agreementValue}
              />
            </Field>
            <Row>
              <Field label="Base Brokerage (%)" style={styles.half}>
                <InputBox
                  value={form.baseBrokeragePct}
                  onChangeText={onPctChange('baseBrokeragePct', 'baseBrokerageRs')}
                  keyboardType="decimal-pad"
                  disabled={slabStatus === 'ok'}
                  placeholder="%"
                />
              </Field>
              <Field
                label="Base Brokerage (Rs.)"
                required
                error={errors.baseBrokerageRs}
                style={styles.half}>
                <InputBox
                  value={form.baseBrokerageRs}
                  onChangeText={onRsChange('baseBrokeragePct', 'baseBrokerageRs')}
                  disabled={slabStatus === 'ok'}
                  keyboardType="decimal-pad"
                  placeholder="₹"
                  error={errors.baseBrokerageRs}
                />
              </Field>
            </Row>
            <Row>
              <Field label="Ladder Brokerage (%)" style={styles.half}>
                <InputBox
                  value={form.ladderBrokeragePct}
                  onChangeText={onPctChange('ladderBrokeragePct', 'ladderBrokerageRs')}
                  keyboardType="decimal-pad"
                  disabled={slabStatus === 'ok'}
                  placeholder="%"
                />
              </Field>
              <Field
                label="Ladder Brokerage (Rs.)"
                required
                error={errors.ladderBrokerageRs}
                style={styles.half}>
                <InputBox
                  value={form.ladderBrokerageRs}
                  onChangeText={onRsChange('ladderBrokeragePct', 'ladderBrokerageRs')}
                  disabled={slabStatus === 'ok'}
                  keyboardType="decimal-pad"
                  placeholder="₹"
                  error={errors.ladderBrokerageRs}
                />
              </Field>
            </Row>
            <Text style={[styles.hint, slabStatus === 'error' && {color: COLORS.red}]}>
              {slabStatus === 'loading'
                ? 'Fetching brokerage slab…'
                : slabStatus === 'ok' && slab
                ? `Slab applied: units ${slab.from_unit}–${slab.to_unit} (this booking = unit ${slab.units}) · Base ${slab.basic}% · Ladder ${slab.extra}%`
                : slabStatus === 'error'
                ? 'Could not load the brokerage slab. Enter brokerage manually.'
                : 'Select a project to load brokerage automatically.'}
            </Text>
            <DropdownField
              label="Source"
              required
              placeholder="Select Source"
              data={sourceOptions}
              value={form.source}
              onChange={set('source')}
              error={errors.source}
              {...ddShared}
            />
            <Field label="Sales Manager" required error={errors.salesManager}>
              <InputBox
                value={form.salesManager}
                onChangeText={set('salesManager')}
                autoCapitalize="words"
                error={errors.salesManager}
              />
            </Field>
            <DropdownField
              label="Relationship Manager"
              required
              placeholder="Select RM"
              data={rmOptions}
              value={form.rm}
              onChange={set('rm')}
              error={errors.rm}
              {...ddShared}
            />
          </Section>

          {/* 3. Documents */}
          <Section title="Documents" icon="folder-open">
            {FILES.map(f => (
              <FileField
                key={f.key}
                label={f.label}
                required={f.required}
                file={files[f.key]}
                onChange={setFile(f.key)}
                error={errors[f.key]}
              />
            ))}
          </Section>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.8}>
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="check-circle" size={16} color="#fff" />
            )}
            <Text style={styles.buttonText}>
              {submitting ? 'Submitting...' : 'Create Booking'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonGhost}
            onPress={cancel}
            disabled={submitting}
            activeOpacity={0.8}>
            <Text style={styles.buttonGhostText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles (same as Rmform)                                              */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#1a2d3e'},
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {color: COLORS.gold, fontWeight: '700', fontSize: 13},
  sectionDivider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 12,
  },

  // ── Fields ──
  inputWrapper: {marginBottom: 10},
  field: {marginBottom: 10},
  half: {flex: 1},
  rowHalf: {flexDirection: 'row', gap: 10},
  label: {
    color: '#8a9daf',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  input: {
    backgroundColor: COLORS.fieldBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    color: '#e6ebf2',
    fontSize: 13,
    borderWidth: 1,
    borderColor: COLORS.fieldBorder,
  },
  multiline: {height: 76, paddingTop: 12},
  hint: {color: COLORS.mutedText, fontSize: 11, marginBottom: 10},
  inputError: {borderColor: COLORS.red},
  inputDisabled: {opacity: 0.5},
  inputWithIcon: {
    backgroundColor: COLORS.fieldBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.fieldBorder,
  },

  // ── Inline dropdown ──
  dropdown: {
    height: 44,
    backgroundColor: COLORS.fieldBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.fieldBorder,
  },
  dropdownOpen: {borderColor: '#4aa3df'},
  dropdownMenu: {
    marginTop: LIST_GAP,
    backgroundColor: COLORS.modalBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.fieldBorder,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#323a52',
  },
  dropdownItemActive: {backgroundColor: 'rgba(74,163,223,0.15)'},
  dropdownItemText: {flex: 1, fontSize: 13, color: COLORS.mutedText, fontWeight: '500'},
  dropdownItemTextActive: {color: COLORS.accent, fontWeight: '600'},
  placeholder: {color: COLORS.mutedText, fontSize: 13},
  selectedText: {color: '#e6ebf2', fontSize: 13, fontWeight: '600'},
  ddTriggerLeft: {flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1},
  ddSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.fieldBorder,
    backgroundColor: '#28304a',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  ddSearchInput: {flex: 1, fontSize: 13, color: COLORS.white, padding: 0},
  ddNoResult: {textAlign: 'center', color: '#6b7690', fontSize: 12, paddingVertical: 16},

  // ── Gender ──
  genderRow: {flexDirection: 'row', alignItems: 'center', marginTop: 4, height: 30},
  radioContainer: {flexDirection: 'row', alignItems: 'center', marginRight: 24},
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.accent,
    marginRight: 6,
  },
  radioActive: {backgroundColor: COLORS.accent},
  radioText: {color: '#e6ebf2', fontSize: 13},

  // ── Files ──
  upload: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.fieldBorder,
    backgroundColor: COLORS.fieldBg,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  uploadText: {color: '#e6ebf2', fontSize: 13, fontWeight: '600'},
  uploadHint: {color: COLORS.mutedText, fontSize: 11, marginLeft: 'auto'},
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,207,255,0.08)',
    borderColor: 'rgba(0,207,255,0.35)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
  },
  fileIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(0,207,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: {color: '#e6ebf2', fontSize: 13, fontWeight: '600'},
  fileSize: {color: COLORS.mutedText, fontSize: 10, marginTop: 1},
  fileAction: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Errors ──
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  errorText: {color: '#ff6b6b', fontSize: 11, fontWeight: '500'},

  // ── Buttons ──
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1e9ce8',
    marginHorizontal: 12,
    marginTop: 4,
    paddingVertical: 13,
    borderRadius: 24,
  },
  buttonDisabled: {opacity: 0.6},
  buttonText: {color: '#fff', fontWeight: '700', fontSize: 14},
  buttonGhost: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  buttonGhostText: {color: '#e6ebf2', fontWeight: '600', fontSize: 14},

  // ── Top Bar ──
  topBarContainer: {
    paddingHorizontal: scale(10),
    paddingBottom: verticalScale(10),
  },
  topBar: {
    height: 42,
    borderRadius: scale(22),
    backgroundColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(14),
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  backBtn: {
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    color: '#ffffff',
    fontSize: 15,
    marginLeft: 6,
    fontWeight: '700',
    flexShrink: 1,
  },
});