import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Platform,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';

const WIDE_BREAKPOINT = 768;
const ACCENT = '#4aa3df';
const GREEN = '#52c97c';
const ORANGE = '#f0a05a';
const RED = '#e05555';

// ─── STEPS & DUMMY OPTIONS ───────────────────────────────────────────────────
const STEPS = [
  { title: 'Project Details', sub: 'Basic information', icon: 'information-circle-outline' },
  { title: 'Location', sub: 'Address & connection', icon: 'location-outline' },
  { title: 'Units', sub: 'Inventory & property mix', icon: 'business-outline' },
  { title: 'Pricing', sub: 'Set the pricing band', icon: 'pricetag-outline' },
  { title: 'Timeline', sub: 'Project timeline & key dates', icon: 'calendar-outline' },
];

const STEP_HEADINGS = [
  { title: 'Project Details', desc: 'Connect this property to the right developer and establish its identity.' },
  { title: 'Project Location', desc: 'Capture a searchable address and help the sales team explain connectivity.' },
  { title: 'Unit Configuration & Inventory', desc: 'Define your project’s structure, available unit types, and sellable stock.' },
  { title: 'Pricing', desc: 'Set the pricing band.' },
  { title: 'Timeline', desc: 'Track important project milestones, from launch to expected possession.' },
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

const formatDate = d =>
  `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

const parseDate = str => {
  if (!str) return new Date();
  const [dd, mm, yy] = str.split('-').map(Number);
  const d = new Date(yy, (mm || 1) - 1, dd || 1);
  return isNaN(d.getTime()) ? new Date() : d;
};

const useWide = () => useWindowDimensions().width >= WIDE_BREAKPOINT;

// ─── LAYOUT HELPERS ──────────────────────────────────────────────────────────
// side by side on wide screens, stacked on mobile
const Row = ({ children }) => {
  const wide = useWide();
  return <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 12 : 0 }}>{children}</View>;
};

const FieldWrap = ({ label, hint, children }) => {
  const wide = useWide();
  return (
    <View style={[{ marginBottom: 10 }, wide && { flex: 1 }]}>
      {label ? <Text style={fieldStyles.label}>{label}</Text> : null}
      {children}
      {hint ? <Text style={fieldStyles.hint}>{hint}</Text> : null}
    </View>
  );
};

const SectionHeader = ({ title, right }) => (
  <View style={styles.sectionHeader}>
    <View style={[styles.sectionDot, { backgroundColor: ACCENT }]} />
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionLine} />
    {right ? <View style={{ marginLeft: 10 }}>{right}</View> : null}
  </View>
);

// ─── TEXT INPUT ──────────────────────────────────────────────────────────────
const TextField = ({ label, value, onChangeText, placeholder, hint, keyboardType, multiline, icon }) => (
  <FieldWrap label={label} hint={hint}>
    <View
      style={[
        fieldStyles.inputWrapper,
        !!value && { borderColor: ACCENT + '60' },
        multiline && { alignItems: 'flex-start', paddingTop: 8, height: undefined, minHeight: 80 },
      ]}
    >
      {icon ? (
        <View style={[fieldStyles.triggerIcon, { backgroundColor: ACCENT + '18', marginRight: 8 }]}>
          <Ionicons name={icon} size={13} color={ACCENT} />
        </View>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor="#8a9daf"
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[fieldStyles.input, { flex: 1 }, multiline && { minHeight: 64, height: undefined, paddingTop: 2 }]}
      />
    </View>
  </FieldWrap>
);

// ─── SELECT (bottom-sheet dropdown with search) ──────────────────────────────
const OptionSheet = ({ visible, label, options, value, onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter(o => o.toLowerCase().includes(q)) : options;
  }, [search, options]);

  const close = () => {
    setSearch('');
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={sheet.backdrop} activeOpacity={1} onPress={close} />
        <View style={sheet.sheet}>
          <View style={sheet.handle} />
          <View style={sheet.sheetHeader}>
            <View style={[sheet.labelPill, { backgroundColor: ACCENT + '25' }]}>
              <Ionicons name="list-outline" size={11} color={ACCENT} style={{ marginRight: 5 }} />
              <Text style={[sheet.labelPillText, { color: ACCENT }]}>{label}</Text>
            </View>
            <TouchableOpacity onPress={close} style={sheet.closeBtn}>
              <Ionicons name="close" size={18} color="#8099ae" />
            </TouchableOpacity>
          </View>

          <View style={[sheet.searchBar, { borderColor: ACCENT + '30' }]}>
            <Ionicons name="search-outline" size={16} color={ACCENT} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search..."
              placeholderTextColor="#9A9490"
              value={search}
              onChangeText={setSearch}
              style={sheet.searchInput}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={ACCENT} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={i => i}
            style={{ maxHeight: 300 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Ionicons name="search-outline" size={28} color="#C8C4BC" />
                <Text style={{ color: '#9A9490', marginTop: 8, fontSize: 13 }}>No results found</Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const selected = item === value;
              return (
                <TouchableOpacity
                  style={[
                    sheet.listItem,
                    selected && { backgroundColor: ACCENT + '18' },
                    index === filtered.length - 1 && { borderBottomWidth: 0 },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    onSelect(item);
                    close();
                  }}
                >
                  {selected && <View style={[sheet.selectedBar, { backgroundColor: ACCENT }]} />}
                  <Text
                    style={[sheet.listItemText, selected && { color: ACCENT, fontWeight: '600' }]}
                    numberOfLines={1}
                  >
                    {item}
                  </Text>
                  {selected && <Ionicons name="checkmark-circle" size={17} color={ACCENT} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const SelectField = ({ label, value, options, onChange, placeholder = 'Select', icon = 'list-outline', hint, compact }) => {
  const [open, setOpen] = useState(false);

  const sheetEl = (
    <OptionSheet
      visible={open}
      label={label || placeholder}
      options={options}
      value={value}
      onSelect={onChange}
      onClose={() => setOpen(false)}
    />
  );

  if (compact) {
    return (
      <>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setOpen(true)}
          style={[styles.compactSelect, !!value && { borderColor: ACCENT + '60' }]}
        >
          <Text
            numberOfLines={1}
            style={[styles.compactText, !value && { color: '#8a9daf', fontWeight: '500' }]}
          >
            {value || placeholder}
          </Text>
          <Ionicons name="chevron-down" size={13} color={ACCENT} />
        </TouchableOpacity>
        {sheetEl}
      </>
    );
  }

  return (
    <FieldWrap label={label} hint={hint}>
      <TouchableOpacity
        style={[fieldStyles.trigger, !!value && { borderColor: ACCENT + '60' }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <View style={fieldStyles.triggerLeft}>
          <View style={[fieldStyles.triggerIcon, { backgroundColor: ACCENT + '18' }]}>
            <Ionicons name={icon} size={13} color={ACCENT} />
          </View>
          <Text
            numberOfLines={1}
            style={[fieldStyles.triggerText, !value && fieldStyles.placeholder, !!value && { fontWeight: '500' }]}
          >
            {value || placeholder}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={13} color={ACCENT} />
      </TouchableOpacity>
      {sheetEl}
    </FieldWrap>
  );
};

// ─── DATE FIELD (Android calendar / iOS spinner sheet) ───────────────────────
const DateField = ({ label, value, onChange }) => {
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const [temp, setTemp] = useState(new Date());

  const press = () => {
    if (Platform.OS === 'android') setShowAndroid(true);
    else {
      setTemp(value ? parseDate(value) : new Date());
      setShowIOS(true);
    }
  };

  return (
    <FieldWrap label={label}>
      <TouchableOpacity
        style={[fieldStyles.trigger, !!value && { borderColor: ACCENT + '60' }]}
        onPress={press}
        activeOpacity={0.8}
      >
        <View style={fieldStyles.triggerLeft}>
          <View style={[fieldStyles.triggerIcon, { backgroundColor: ACCENT + '22' }]}>
            <Ionicons name="calendar-outline" size={13} color={ACCENT} />
          </View>
          <Text style={[fieldStyles.triggerText, !value && fieldStyles.placeholder, !!value && { fontWeight: '500' }]}>
            {value || 'dd-mm-yyyy'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={13} color={ACCENT} />
      </TouchableOpacity>

      {Platform.OS === 'android' && showAndroid && (
        <DateTimePicker
          value={value ? parseDate(value) : new Date()}
          mode="date"
          display="calendar"
          onChange={(event, d) => {
            setShowAndroid(false);
            if (event.type === 'set' && d) onChange(formatDate(d));
          }}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={showIOS} transparent animationType="slide" onRequestClose={() => setShowIOS(false)}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <TouchableOpacity style={sheet.backdrop} activeOpacity={1} onPress={() => setShowIOS(false)} />
            <View style={[sheet.sheet, { backgroundColor: '#1C2128' }]}>
              <View style={sheet.handle} />
              <View style={[sheet.sheetHeader, { justifyContent: 'space-between' }]}>
                <TouchableOpacity onPress={() => setShowIOS(false)} style={{ minWidth: 70 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>Cancel</Text>
                </TouchableOpacity>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Select Date</Text>
                <TouchableOpacity
                  onPress={() => {
                    onChange(formatDate(temp));
                    setShowIOS(false);
                  }}
                  style={[styles.doneBtn, { backgroundColor: ACCENT }]}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={temp}
                mode="date"
                display="spinner"
                onChange={(_, d) => d && setTemp(d)}
                textColor="#FFFFFF"
                themeVariant="dark"
                style={{ height: 216 }}
              />
            </View>
          </View>
        </Modal>
      )}
    </FieldWrap>
  );
};

// ─── SMALL BUTTONS ───────────────────────────────────────────────────────────
const AddMoreBtn = ({ label = 'Add More', onPress }) => (
  <TouchableOpacity style={styles.addMoreBtn} onPress={onPress} activeOpacity={0.75}>
    <Ionicons name="add-circle-outline" size={16} color={ACCENT} style={{ marginRight: 6 }} />
    <Text style={styles.addMoreText}>{label}</Text>
  </TouchableOpacity>
);

const RemoveBtn = ({ onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.removeRowBtn}
    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
  >
    <Ionicons name="trash-outline" size={16} color={RED} />
  </TouchableOpacity>
);

const SubmitSmall = () => (
  <TouchableOpacity style={styles.submitSmall} activeOpacity={0.85}>
    <Ionicons name="checkmark" size={14} color={GREEN} style={{ marginRight: 4 }} />
    <Text style={styles.submitSmallText}>Submit</Text>
  </TouchableOpacity>
);

// one repeating row + its remove button
const RepeatRow = ({ children, canRemove, onRemove }) => {
  const wide = useWide();
  return (
    <View style={[{ marginBottom: 4 }, wide && { flexDirection: 'row', alignItems: 'flex-end', gap: 10 }]}>
      <View style={{ flex: 1 }}>{children}</View>
      {canRemove ? (
        <View style={wide ? { marginBottom: 14 } : { alignSelf: 'flex-end', marginBottom: 12 }}>
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

  const towerNames = form.towers.map(t => t.tower).filter(Boolean);
  const phaseNames = form.phases.filter(Boolean);

  // ── STEP 1 ──
  const renderStep1 = () => (
    <>
      <Row>
        <SelectField
          label="Project *"
          value={form.project}
          options={OPT.project}
          onChange={v => set('project', v)}
          icon="folder-open-outline"
          hint="The location and next steps are saved against this project."
        />
        <TextField
          label="RERA Registration Number"
          value={form.rera}
          onChangeText={v => set('rera', v)}
          placeholder="Enter RERA registration ID"
          icon="document-text-outline"
          hint="Applicable to registered projects under local rules."
        />
      </Row>
      <Row>
        <SelectField label="Project Type *" value={form.projectType} options={OPT.projectType} onChange={v => set('projectType', v)} icon="layers-outline" />
        <SelectField label="Property Category *" value={form.category} options={OPT.category} onChange={v => set('category', v)} icon="home-outline" />
        <SelectField label="Construction Status" value={form.status} options={OPT.status} onChange={v => set('status', v)} placeholder="Select status" icon="construct-outline" />
      </Row>
      <TextField
        label="Project Overview"
        value={form.overview}
        onChangeText={v => set('overview', v)}
        placeholder="Describe the project concept, standout features and its key selling points..."
        hint="Keep the overview concise. You can add brochures and floor plans later."
        multiline
      />
    </>
  );

  // ── STEP 2 ──
  const renderStep2 = () => (
    <>
      <TextField label="Site Address" value={form.address} onChangeText={v => set('address', v)} placeholder="Street, building, area" icon="location-outline" />
      <Row>
        <TextField label="Locality / Neighbourhood" value={form.locality} onChangeText={v => set('locality', v)} placeholder="Locality" icon="navigate-outline" />
        <TextField label="Nearby landmark" value={form.landmark} onChangeText={v => set('landmark', v)} placeholder="e.g. Metro station or major road" icon="flag-outline" />
      </Row>
      <Row>
        <SelectField label="City *" value={form.city} options={OPT.city} onChange={v => set('city', v)} icon="business-outline" />
        <SelectField label="State *" value={form.state} options={OPT.state} onChange={v => set('state', v)} icon="map-outline" />
      </Row>
      <Row>
        <TextField label="PIN code" value={form.pin} onChangeText={v => set('pin', v)} placeholder="PIN code" keyboardType="number-pad" icon="mail-outline" />
        <SelectField label="Country" value={form.country} options={OPT.country} onChange={v => set('country', v)} icon="globe-outline" />
      </Row>
      <TextField label="Google Maps location link" value={form.mapLink} onChangeText={v => set('mapLink', v)} placeholder="Paste Google Maps shareable link" icon="link-outline" />

      <SectionHeader title="Map placement" />
      <View style={styles.mapBox}>
        <Ionicons name="map-outline" size={32} color={ACCENT} />
        <Text style={styles.mapText}>Map preview</Text>
      </View>
      <Text style={[fieldStyles.hint, { textAlign: 'center', marginBottom: 4 }]}>
        Paste a Google Maps link, or tap the map to drop a pin.
      </Text>
    </>
  );

  // ── STEP 3 ──
  const renderStep3 = () => (
    <>
      <SectionHeader title="Phase" />
      {form.phases.map((ph, i) => (
        <RepeatRow key={`ph${i}`} canRemove={form.phases.length > 1} onRemove={() => removeRow('phases', i)}>
          <FieldWrap>
            <View style={[fieldStyles.inputWrapper, !!ph && { borderColor: ACCENT + '60' }]}>
              <View style={[fieldStyles.triggerIcon, { backgroundColor: ACCENT + '18', marginRight: 8 }]}>
                <Ionicons name="git-branch-outline" size={13} color={ACCENT} />
              </View>
              <TextInput
                value={ph}
                onChangeText={v => setRow('phases', i, null, v)}
                placeholder="Phase name"
                placeholderTextColor="#8a9daf"
                style={[fieldStyles.input, { flex: 1 }]}
              />
            </View>
          </FieldWrap>
        </RepeatRow>
      ))}
      <View style={styles.actionRow}>
        <AddMoreBtn onPress={() => addRow('phases', '')} />
        <SubmitSmall />
      </View>

      <SectionHeader
        title="Project at a glance"
        right={<SelectField compact value={form.glancePhase} options={phaseNames} onChange={v => set('glancePhase', v)} placeholder="Phase" />}
      />
      {form.towers.map((t, i) => (
        <RepeatRow key={`tw${i}`} canRemove={form.towers.length > 1} onRemove={() => removeRow('towers', i)}>
          <Row>
            <TextField label="Towers / Blocks" value={t.tower} onChangeText={v => setRow('towers', i, 'tower', v)} placeholder="Tower name" icon="business-outline" />
            <TextField label="Total Floors" value={t.floors} onChangeText={v => setRow('towers', i, 'floors', v)} placeholder="0" keyboardType="number-pad" icon="layers-outline" />
            <TextField label="Total Units" value={t.units} onChangeText={v => setRow('towers', i, 'units', v)} placeholder="0" keyboardType="number-pad" icon="grid-outline" />
            <TextField label="Parking Slots" value={t.parking} onChangeText={v => setRow('towers', i, 'parking', v)} placeholder="0" keyboardType="number-pad" icon="car-outline" />
          </Row>
        </RepeatRow>
      ))}
      <View style={styles.actionRow}>
        <AddMoreBtn onPress={() => addRow('towers', emptyTower)} />
        <SubmitSmall />
      </View>

      <SectionHeader
        title="Available configurations"
        right={<SelectField compact value={form.configTower} options={towerNames} onChange={v => set('configTower', v)} placeholder="Tower" />}
      />
      {form.configs.map((c, i) => (
        <RepeatRow key={`cf${i}`} canRemove={form.configs.length > 1} onRemove={() => removeRow('configs', i)}>
          <View style={styles.subCard}>
            <Row>
              <SelectField label="Configuration" value={c.configuration} options={OPT.configuration} onChange={v => setRow('configs', i, 'configuration', v)} icon="bed-outline" />
              <SelectField label="Unit Type" value={c.unitType} options={OPT.unitType} onChange={v => setRow('configs', i, 'unitType', v)} icon="cube-outline" />
              <SelectField label="Floor" value={c.floor} options={OPT.floor} onChange={v => setRow('configs', i, 'floor', v)} icon="layers-outline" />
            </Row>
            <Row>
              <TextField label="Unit Name" value={c.unitName} onChangeText={v => setRow('configs', i, 'unitName', v)} placeholder="e.g. 1A" icon="pricetag-outline" />
              <TextField label="Saleable Area (sq ft)" value={c.saleable} onChangeText={v => setRow('configs', i, 'saleable', v)} placeholder="Saleable Area" keyboardType="numeric" icon="resize-outline" />
              <TextField label="Carpet Area (sq ft)" value={c.carpet} onChangeText={v => setRow('configs', i, 'carpet', v)} placeholder="Carpet area" keyboardType="numeric" icon="resize-outline" />
              <TextField label="Balcony Area (sq ft)" value={c.balcony} onChangeText={v => setRow('configs', i, 'balcony', v)} placeholder="Balcony area" keyboardType="numeric" icon="resize-outline" />
            </Row>
          </View>
        </RepeatRow>
      ))}
      <View style={styles.actionRow}>
        <AddMoreBtn label="Add Configuration" onPress={() => addRow('configs', emptyConfig)} />
        <SubmitSmall />
      </View>
    </>
  );

  // ── STEP 4 ──
  const renderStep4 = () => (
    <>
      <Row>
        <SelectField label="Phase" value={form.pricePhase} options={phaseNames} onChange={v => set('pricePhase', v)} placeholder="Select phase" icon="git-branch-outline" />
        <SelectField label="Towers / Blocks" value={form.priceTower} options={towerNames} onChange={v => set('priceTower', v)} placeholder="Select tower" icon="business-outline" />
        <TextField label="Booking Amount" value={form.booking} onChangeText={v => set('booking', v)} placeholder="₹5000000" keyboardType="numeric" icon="cash-outline" />
      </Row>

      {!form.pricePhase || !form.priceTower ? (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={15} color={ORANGE} style={{ marginRight: 6 }} />
          <Text style={styles.infoBannerText}>Select a phase and a tower to set its pricing.</Text>
        </View>
      ) : (
        <>
          <SectionHeader title="Price / sq.ft. (Date-wise)" />
          {form.prices.map((p, i) => (
            <RepeatRow key={`pr${i}`} canRemove={form.prices.length > 1} onRemove={() => removeRow('prices', i)}>
              <Row>
                <TextField value={p.price} onChangeText={v => setRow('prices', i, 'price', v)} placeholder="₹ / sq ft" keyboardType="numeric" icon="cash-outline" />
                <DateField value={p.date} onChange={v => setRow('prices', i, 'date', v)} />
              </Row>
            </RepeatRow>
          ))}
          <AddMoreBtn onPress={() => addRow('prices', emptyPrice)} />

          <SectionHeader
            title="Floor escalation"
            right={<SelectField compact value={form.escMode} options={OPT.escalation} onChange={v => set('escMode', v)} />}
          />
          {form.escalations.map((e, i) => (
            <RepeatRow key={`es${i}`} canRemove={form.escalations.length > 1} onRemove={() => removeRow('escalations', i)}>
              <Row>
                <TextField value={e.from} onChangeText={v => setRow('escalations', i, 'from', v)} placeholder={form.escMode === 'With Range' ? 'From floor' : 'Floor number'} keyboardType="number-pad" icon="layers-outline" />
                {form.escMode === 'With Range' && (
                  <TextField value={e.to} onChangeText={v => setRow('escalations', i, 'to', v)} placeholder="To floor" keyboardType="number-pad" icon="layers-outline" />
                )}
                <TextField value={e.rate} onChangeText={v => setRow('escalations', i, 'rate', v)} placeholder="₹500 / sq ft" keyboardType="numeric" icon="trending-up-outline" />
              </Row>
            </RepeatRow>
          ))}
          <AddMoreBtn onPress={() => addRow('escalations', emptyEsc)} />

          <SectionHeader title="PLC" />
          {form.plcs.map((p, i) => (
            <RepeatRow key={`pl${i}`} canRemove={form.plcs.length > 1} onRemove={() => removeRow('plcs', i)}>
              <Row>
                <SelectField value={p.plc} options={OPT.plc} onChange={v => setRow('plcs', i, 'plc', v)} placeholder="PLC" icon="star-outline" />
                <SelectField value={p.unit} options={OPT.unit} onChange={v => setRow('plcs', i, 'unit', v)} placeholder="Unit" icon="options-outline" />
                <TextField value={p.amount} onChangeText={v => setRow('plcs', i, 'amount', v)} placeholder="Amount" keyboardType="numeric" icon="cash-outline" />
              </Row>
            </RepeatRow>
          ))}
          <AddMoreBtn onPress={() => addRow('plcs', emptyPlc)} />
        </>
      )}
    </>
  );

  // ── STEP 5 ──
  const renderStep5 = () => (
    <>
      <SectionHeader title="Key dates & ownership" />
      <Row>
        <DateField label="Project Launch Date" value={form.launch} onChange={v => set('launch', v)} />
        <DateField label="Expected Possession Date" value={form.possession} onChange={v => set('possession', v)} />
      </Row>
    </>
  );

  const renderStep = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5][step];
  const heading = STEP_HEADINGS[step];

  const buttons = (
    <View style={styles.btnRow}>
      <TouchableOpacity style={styles.resetBtn} onPress={goBack} activeOpacity={0.8}>
        <Ionicons name="arrow-back-outline" size={16} color="#c3cbdb" style={{ marginRight: 6 }} />
        <Text style={styles.resetBtnText}>Back</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.submitBtn, { backgroundColor: ACCENT }]} onPress={goNext} activeOpacity={0.85}>
        <Ionicons
          name={isLast ? 'checkmark-circle-outline' : 'arrow-forward-circle-outline'}
          size={17}
          color="#fff"
          style={{ marginRight: 6 }}
        />
        <Text style={styles.submitBtnText}>{isLast ? 'Submit' : 'Save & Continue'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground
        source={require('../asset/image/bg-img.png')}
        style={styles.bgImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={[styles.headerGlow, { backgroundColor: ACCENT }]} />
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#e6ebf2" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={[styles.headerIconCircle, { backgroundColor: ACCENT + '22', borderColor: ACCENT + '50' }]}>
              <Ionicons name={STEPS[step].icon} size={22} color={ACCENT} />
            </View>
            <Text style={styles.headerTitle}>Create Project</Text>
            <Text style={styles.headerSub}>{STEPS[step].sub}</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn} activeOpacity={0.8}>
            <Ionicons name="eye-outline" size={20} color="#e6ebf2" />
          </TouchableOpacity>
        </View>

        {/* Step pills + progress */}
        <View style={styles.pillRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}
          >
            {STEPS.map((s, i) => {
              const active = i === step;
              const done = i < step;
              const color = done ? GREEN : ACCENT;
              return (
                <TouchableOpacity
                  key={s.title}
                  activeOpacity={0.8}
                  onPress={() => setStep(i)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: active ? ACCENT : '#2b3348',
                      borderColor: active ? ACCENT : done ? GREEN + '80' : '#39415a',
                    },
                  ]}
                >
                  <Ionicons
                    name={done ? 'checkmark-circle' : s.icon}
                    size={13}
                    color={active ? '#fff' : done ? color : '#8a9daf'}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[styles.pillText, { color: active ? '#fff' : done ? color : '#8a9daf' }]}>
                    {s.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.progressWrap}>
            <View style={styles.barsRow}>
              {STEPS.map((_, i) => (
                <View key={i} style={[styles.bar, i <= step && { backgroundColor: ACCENT }]} />
              ))}
            </View>
            {/* <Text style={styles.progressText}>Step {step + 1} of 5</Text> */}
          </View>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.scrollContent,
              wide && { maxWidth: 980, alignSelf: 'center', width: '100%' },
              { paddingBottom: 110 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.formCard}>
              <View style={styles.cardHeading}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{heading.title}</Text>
                  <Text style={styles.cardDesc}>{heading.desc}</Text>
                </View>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{step + 1}</Text>
                </View>
              </View>
              {renderStep()}
            </View>

            {buttons}
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

// ─── FIELD STYLES (same as the interview form) ───────────────────────────────
const fieldStyles = StyleSheet.create({
  label: {
    fontSize: 10.5,
    color: '#8a9daf',
    marginBottom: 5,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  hint: { fontSize: 10, color: '#8a9daf', marginTop: 4 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2b3348',
    borderRadius: 11,
    height: 40,
    paddingHorizontal: 10,
    borderWidth: 1.2,
    borderColor: '#39415a',
  },
  triggerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  triggerIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  triggerText: { fontSize: 13, color: '#e6ebf2', flex: 1 },
  placeholder: { color: '#8a9daf' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2b3348',
    borderRadius: 11,
    height: 40,
    paddingHorizontal: 10,
    borderWidth: 1.2,
    borderColor: '#39415a',
  },
  input: { color: '#e6ebf2', fontSize: 13, paddingVertical: 0, height: 38 },
});

// ─── BOTTOM SHEET STYLES ─────────────────────────────────────────────────────
const sheet = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: '#21283a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  labelPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  labelPillText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2b3348',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2b3348',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  searchInput: { flex: 1, color: '#e6ebf2', fontSize: 14, padding: 0 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  selectedBar: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2 },
  listItemText: { flex: 1, fontSize: 13.5, color: '#c3cbdb', marginLeft: 6 },
});

// ─── SCREEN STYLES ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1a2d3e' },
  bgImage: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(18,32,48,0.72)' },

  // header
  header: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingBottom: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    elevation: 4,
  },
  headerGlow: {
    position: 'absolute',
    top: -60,
    left: '50%',
    width: 200,
    height: 120,
    borderRadius: 100,
    opacity: 0.15,
    marginLeft: -100,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#e6ebf2', letterSpacing: 0.2 },
  headerSub: { fontSize: 12, color: '#8a9daf', marginTop: 3 },

  // step pills
  pillRow: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    elevation: 2,
  },
  pillText: { fontSize: 12, fontWeight: '700' },
  progressWrap: { paddingHorizontal: 16, marginTop: 10 },
  barsRow: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)' },
  progressText: { color: ORANGE, fontSize: 10.5, fontWeight: '700', marginTop: 6, textAlign: 'right' },

  // form card
  scrollContent: { padding: 14, paddingTop: 12 },
  formCard: {
    backgroundColor: '#21283a',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    elevation: 3,
  },
  cardHeading: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#e6ebf2' },
  cardDesc: { fontSize: 11.5, color: '#8a9daf', marginTop: 3, lineHeight: 16 },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ACCENT + '25',
    borderWidth: 1,
    borderColor: ACCENT + '60',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  stepBadgeText: { color: ACCENT, fontSize: 11, fontWeight: '800' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 10 },
  sectionDot: { width: 3, height: 14, borderRadius: 2, marginRight: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8a9daf',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginRight: 10,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.10)' },

  // compact dark select (header pills)
  compactSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    minWidth: 96,
    maxWidth: 160,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#2b3348',
    borderWidth: 1.2,
    borderColor: '#39415a',
  },
  compactText: { flex: 1, color: '#e6ebf2', fontSize: 11.5, fontWeight: '600' },

  // repeat rows / buttons
  subCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 14,
    padding: 10,
    paddingBottom: 0,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: ACCENT + '50',
    marginBottom: 6,
  },
  addMoreText: { fontSize: 12, fontWeight: '700', color: ACCENT },
  removeRowBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(224,85,85,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(224,85,85,0.35)',
  },
  submitSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(82,201,124,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(82,201,124,0.4)',
    marginBottom: 6,
  },
  submitSmallText: { color: GREEN, fontSize: 12, fontWeight: '700' },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(240,160,90,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(240,160,90,0.35)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoBannerText: { color: ORANGE, fontSize: 12, flex: 1 },

  mapBox: {
    height: 140,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#39415a',
    backgroundColor: '#2b3348',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 8,
  },
  mapText: { color: '#8a9daf', fontSize: 12 },

  doneBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12, minWidth: 70, alignItems: 'center' },

  // bottom buttons
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  resetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 14,
    backgroundColor: '#2b3348',
    borderWidth: 1.2,
    borderColor: '#39415a',
  },
  resetBtnText: { fontSize: 13, color: '#c3cbdb', fontWeight: '700' },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 14,
    elevation: 5,
  },
  submitBtnText: { fontSize: 14, color: '#fff', fontWeight: '800', letterSpacing: 0.2 },
});