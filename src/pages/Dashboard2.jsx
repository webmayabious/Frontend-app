import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Calendar} from 'react-native-calendars';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {Circle, Line, Path, Rect, Text as SvgText} from 'react-native-svg';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {keepPreviousData, useQuery} from '@tanstack/react-query';
import {useNavigation} from '@react-navigation/native';
import api from '../api/AxiosInstance';

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */
const C = {
  bgTop: '#1b2420',
  bgMid: '#26342a',
  bgBottom: '#121a16',
  glass: 'rgba(255,255,255,0.09)',
  glassStrong: 'rgba(255,255,255,0.12)',
  border: 'rgba(255,255,255,0.18)',
  grid: 'rgba(255,255,255,0.14)',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.62)',
  cyan: '#1de9ff',
  orange: '#f0a64b',
  green: '#7cb35a',
  red: '#a44848',
  blue: '#2d8ee0',
};

/* ------------------------------------------------------------------ */
/* Animation helpers (Reanimated: runs on the UI thread, smooth on      */
/* Android and iOS). A card animates when it scrolls into view.        */
/* ------------------------------------------------------------------ */
const ScrollCtx = createContext(null); // {scrollY, viewH}
const CardCtx = createContext(null); // {grow}

const clamp01 = v => {
  'worklet';
  return Math.min(Math.max(v, 0), 1);
};

const EASE = Easing.out(Easing.cubic);

// Wraps a card: slides in and starts its charts when it enters the screen.
// When it fully leaves the screen it resets, so it plays again on return.
function Reveal({children}) {
  const {scrollY, viewH, ready} = useContext(ScrollCtx);
  const top = useSharedValue(0);
  const height = useSharedValue(0);
  const enter = useSharedValue(0);
  const grow = useSharedValue(0);
  const shown = useSharedValue(0);

  useAnimatedReaction(
    () => {
      // wait until the data has loaded and the card has been measured
      if (ready.value === 0 || height.value === 0 || viewH.value === 0) {
        return -1;
      }
      const t = top.value - scrollY.value; // card top inside the viewport
      const visible =
        Math.min(t + height.value, viewH.value) - Math.max(t, 0);
      return Math.max(visible, 0) / height.value;
    },
    frac => {
      if (frac < 0) {
        return;
      }
      if (frac > 0.2 && shown.value === 0) {
        shown.value = 1;
        enter.value = withTiming(1, {duration: 500, easing: EASE});
        grow.value = withDelay(
          220,
          withTiming(1, {duration: 1000, easing: EASE}),
        );
      } else if (frac <= 0 && shown.value === 1) {
        shown.value = 0;
        enter.value = 0;
        grow.value = 0;
      }
    },
  );

  // No slide/opacity on the card itself: a translateY bigger than the gap
  // between cards made neighbouring cards overlap while scrolling. Only the
  // charts animate (see ChartLayer).

  // lets a card replay its chart animation (e.g. when the period changes)
  const replay = useCallback(() => {
    grow.value = 0;
    grow.value = withTiming(1, {duration: 900, easing: EASE});
  }, [grow]);

  const ctx = useMemo(() => ({grow, replay}), [grow, replay]);

  return (
    <CardCtx.Provider value={ctx}>
      <View
        onLayout={e => {
          top.value = e.nativeEvent.layout.y;
          height.value = e.nativeEvent.layout.height;
        }}>
        {children}
      </View>
    </CardCtx.Provider>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// One pie slice, drawn as a thick circle stroke. Its dash grows with the
// card's progress, so the pie sweeps around clockwise.
function PieSlice({cx, cy, r, color, startFrac, frac, grow}) {
  const R = r / 2;
  const circ = 2 * Math.PI * R;
  const animatedProps = useAnimatedProps(() => {
    const p = clamp01((grow.value - startFrac) / frac);
    return {strokeDasharray: [circ * frac * p + 0.01, circ]};
  });
  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={R}
      fill="none"
      stroke={color}
      strokeWidth={r}
      rotation={-90 + startFrac * 360}
      origin={`${cx}, ${cy}`}
      animatedProps={animatedProps}
    />
  );
}

// Chart data layer. Only transform + opacity are animated (one node per
// chart), which Reanimated applies directly on the UI thread. That keeps
// scrolling smooth even while a chart is animating.
function ChartLayer({width, height, originY, children}) {
  const {grow} = useContext(CardCtx);
  const style = useAnimatedStyle(() => {
    const p = clamp01(grow.value);
    return {
      opacity: clamp01(p * 2.5),
      transform: [{scaleY: Math.max(p, 0.001)}],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width,
          height,
          transformOrigin: [width / 2, originY, 0],
        },
        style,
      ]}>
      {children}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Chart helpers                                                       */
/* ------------------------------------------------------------------ */
const smoothPath = pts => {
  if (pts.length < 2) {
    return '';
  }
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
};

const PAD = {l: 24, r: 6, t: 6, b: 26};

function Grid({width, height, yMax, ticks}) {
  const innerH = height - PAD.t - PAD.b;
  const step = yMax / ticks;
  return (
    <>
      {Array.from({length: ticks + 1}).map((_, i) => {
        const v = Math.round(step * i);
        const y = PAD.t + innerH - (i / ticks) * innerH;
        return (
          <React.Fragment key={i}>
            <Line
              x1={PAD.l}
              x2={width - PAD.r}
              y1={y}
              y2={y}
              stroke={C.grid}
              strokeWidth={1}
            />
            <SvgText
              x={PAD.l - 6}
              y={y + 3}
              fill={C.muted}
              fontSize={8}
              textAnchor="end">
              {v}
            </SvgText>
          </React.Fragment>
        );
      })}
    </>
  );
}

function LineChart({width, height = 130, series, labels, yMax, ticks = 4}) {
  if (!width) {
    return null;
  }
  const innerW = width - PAD.l - PAD.r;
  const innerH = height - PAD.t - PAD.b;
  const n = labels.length;
  const xAt = i => PAD.l + (n === 1 ? 0 : (i / (n - 1)) * innerW);
  const yAt = v => PAD.t + innerH - (v / yMax) * innerH;

  return (
    <View style={{width, height}}>
      {/* static layer: grid + labels */}
      <Svg width={width} height={height}>
        <Grid width={width} height={height} yMax={yMax} ticks={ticks} />
        {labels.map((l, i) =>
          l ? (
            <SvgText
              key={i}
              x={xAt(i)}
              y={height - 8}
              fill={C.muted}
              fontSize={7}
              textAnchor="middle"
              transform={`rotate(-20 ${xAt(i)} ${height - 8})`}>
              {l}
            </SvgText>
          ) : null,
        )}
      </Svg>
      {/* animated layer: lines + dots */}
      <ChartLayer width={width} height={height} originY={PAD.t + innerH}>
        <Svg width={width} height={height}>
          {series.map(sr => {
            const pts = sr.values.map((v, i) => ({x: xAt(i), y: yAt(v)}));
            return (
              <React.Fragment key={sr.color}>
                <Path
                  d={smoothPath(pts)}
                  stroke={sr.color}
                  strokeWidth={1.8}
                  fill="none"
                  strokeLinecap="round"
                />
                {pts.map((pt, i) => (
                  <Circle key={i} cx={pt.x} cy={pt.y} r={2.4} fill={sr.color} />
                ))}
              </React.Fragment>
            );
          })}
        </Svg>
      </ChartLayer>
    </View>
  );
}

function BarChart({
  width,
  height = 130,
  groups,
  yMax,
  ticks = 4,
  barWidth = 12,
  labelSize = 7,
  rotate = -20,
}) {
  if (!width) {
    return null;
  }
  const innerW = width - PAD.l - PAD.r;
  const innerH = height - PAD.t - PAD.b;
  const slot = innerW / groups.length;
  const yAt = v => (v / yMax) * innerH;

  return (
    <View style={{width, height}}>
      {/* static layer: grid + labels */}
      <Svg width={width} height={height}>
        <Grid width={width} height={height} yMax={yMax} ticks={ticks} />
        {groups.map((g, gi) => {
          const lx = PAD.l + slot * gi + slot / 2;
          return g.label ? (
            <SvgText
              key={gi}
              x={lx}
              y={height - 8}
              fill={C.muted}
              fontSize={labelSize}
              textAnchor="middle"
              transform={`rotate(${rotate} ${lx} ${height - 8})`}>
              {g.label}
            </SvgText>
          ) : null;
        })}
      </Svg>
      {/* animated layer: bars grow up from the baseline */}
      <ChartLayer width={width} height={height} originY={PAD.t + innerH}>
        <Svg width={width} height={height}>
          {groups.map((g, gi) => {
            const cx = PAD.l + slot * gi + slot / 2;
            const bars = g.bars || [g.segments];
            const total = bars.length;
            const gap = 3;
            const startX = cx - (total * barWidth + (total - 1) * gap) / 2;
            return (
              <React.Fragment key={gi}>
                {g.backdrop ? (
                  <Rect
                    x={cx - barWidth / 2}
                    y={PAD.t + innerH - yAt(g.backdrop)}
                    width={barWidth}
                    height={yAt(g.backdrop)}
                    fill="rgba(255,255,255,0.22)"
                  />
                ) : null}
                {bars.map((segs, bi) => {
                  let acc = 0;
                  const x = startX + bi * (barWidth + gap);
                  return segs.map((sg, si) => {
                    const h = Math.max(yAt(sg.value), 0);
                    const y = PAD.t + innerH - acc - h;
                    acc += h;
                    return (
                      <Rect
                        key={`${bi}-${si}`}
                        x={x}
                        y={y}
                        width={barWidth}
                        height={h}
                        fill={sg.color}
                      />
                    );
                  });
                })}
              </React.Fragment>
            );
          })}
        </Svg>
      </ChartLayer>
    </View>
  );
}

function PieChart({width, height = 140, slices}) {
  const {grow} = useContext(CardCtx);
  if (!width) {
    return null;
  }
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - 10;
  const total = slices.reduce((a, b) => a + b.value, 0);

  let start = 0;
  const parts = slices
    .filter(sl => sl.value > 0)
    .map(sl => {
      const frac = sl.value / total;
      const part = {color: sl.color, startFrac: start, frac};
      start += frac;
      return part;
    });

  return (
    <Svg width={width} height={height}>
      {total === 0 ? (
        <Circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.15)" />
      ) : (
        parts.map((p, i) => (
          <PieSlice
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            color={p.color}
            startFrac={p.startFrac}
            frac={p.frac}
            grow={grow}
          />
        ))
      )}
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* UI pieces                                                           */
/* ------------------------------------------------------------------ */
const PERIODS = ['Weekly', 'Monthly', 'Till Date'];
const PERIOD_ICONS = {
  Today: 'today',
  Weekly: 'view-week',
  Monthly: 'calendar-view-month',
  'Till Date': 'history',
  Custom: 'date-range',
};
const ACCENT = '#07a6f6';
// Space between the bottom of the pill and the top of the menu (px).
// Change this number to move the dropdown menu up or down.
const MENU_TOP_OFFSET = Platform.OS === 'ios' ? 10 : 50;

// Dropdown: a pill that opens a small floating menu with an arrow pointer.
// It is shown in a Modal so the card never clips it.
function Dropdown({value, onChange, options = PERIODS}) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({x: 0, y: 0, w: 0});
  const MENU_W = 140;

  const show = () => {
    ref.current &&
      ref.current.measureInWindow((x, y, w, h) => {
        setPos({x, y: y + h + MENU_TOP_OFFSET, w});
        setOpen(true);
      });
  };

  const left = Math.max(8, pos.x + pos.w - MENU_W);
  // keep the arrow under the pill's centre
  const arrowRight = Math.max(12, left + MENU_W - (pos.x + pos.w / 2) - 6);

  return (
    <>
      <TouchableOpacity
        ref={ref}
        collapsable={false}
        activeOpacity={0.8}
        style={[s.dropdown, open && s.dropdownOpen]}
        onPress={show}>
        <Icon name={PERIOD_ICONS[value] || 'event'} size={13} color={open ? ACCENT : C.muted} />
        <Text style={s.dropdownText}>{value}</Text>
        <Icon
          name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={16}
          color={C.text}
        />
      </TouchableOpacity>

      <Modal
        transparent
        visible={open}
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setOpen(false)}
        />
        <Animated.View
          entering={FadeInUp.duration(160)}
          style={[s.menu, {top: pos.y, left, width: MENU_W}]}>
          <View style={[s.menuArrow, {right: arrowRight}]} />
          {options.map(o => {
            const active = o === value;
            return (
              <TouchableOpacity
                key={o}
                activeOpacity={0.7}
                style={[s.menuItem, active && s.menuItemActive]}
                onPress={() => {
                  onChange(o);
                  setOpen(false);
                }}>
                <Icon
                  name={PERIOD_ICONS[o] || 'event'}
                  size={16}
                  color={active ? ACCENT : C.muted}
                />
                <Text style={[s.menuText, active && s.menuTextActive]}>
                  {o}
                </Text>
                {active ? (
                  <Icon name="check" size={16} color={ACCENT} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </Modal>
    </>
  );
}

function Pager({active = 0, count = 2, onPress}) {
  return (
    <View style={s.pager}>
      {Array.from({length: count}).map((_, i) => (
        <TouchableOpacity
          key={i}
          hitSlop={{top: 10, bottom: 10, left: 6, right: 6}}
          onPress={() => onPress && onPress(i)}>
          <View style={[s.dot, i === active && s.dotActive]} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// "View" button at the bottom right of a card (springs when pressed)
function OpenButton({onPress}) {
  const scale = useSharedValue(1);
  const pop = useAnimatedStyle(() => ({transform: [{scale: scale.value}]}));
  const spring = to => {
    scale.value = withSpring(to, {damping: 14, stiffness: 320});
  };
  return (
    <Animated.View style={[s.openShadow, pop]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => spring(0.93)}
        onPressOut={() => spring(1)}
        hitSlop={8}
        android_ripple={{color: 'rgba(255,255,255,0.3)', foreground: true}}
        style={s.openBtn}>
        <View pointerEvents="none" style={s.openGloss} />
        <Text style={s.openBtnText}>View</Text>
        <View style={s.openBtnArrow}>
          <Icon name="arrow-forward" size={12} color="#1d6fe0" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

// Card with a header and swipeable chart pages (swipe, or tap the dots)
function Card({
  title,
  total,
  totalLabel = 'Total',
  right,
  date,
  pages,
  chartHeight = 140,
  below,
  showOpen = true,
  onOpen,
  replayKey,
}) {
  const {replay} = useContext(CardCtx);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    replay(); // period changed: play the chart animation again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayKey]);

  const [page, setPage] = useState(0);
  const [w, setW] = useState(0);
  const ref = useRef(null);

  const go = i => {
    setPage(i);
    ref.current && ref.current.scrollTo({x: i * w, animated: true});
  };

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        {typeof title === 'string' ? (
          <Text style={s.cardTitle}>{title}</Text>
        ) : (
          title
        )}
        {right}
      </View>
      <View style={s.totalRow}>
        <Text style={s.total}>{total}</Text>
        <Text style={s.totalLabel}>{totalLabel}</Text>
        <View style={{flex: 1}} />
        {date ? <Text style={s.date}>{date}</Text> : null}
      </View>

      <View
        style={{height: chartHeight, marginTop: 2}}
        onLayout={e => setW(e.nativeEvent.layout.width)}>
        {w > 0 ? (
          <ScrollView
            ref={ref}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            // iOS: lock to one direction so a vertical swipe that starts on a
            // chart scrolls the page instead of being captured by the chart
            directionalLockEnabled
            alwaysBounceHorizontal={false}
            alwaysBounceVertical={false}
            scrollEventThrottle={16}
            decelerationRate="fast"
            bounces={false}
            overScrollMode="never"
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e =>
              setPage(Math.round(e.nativeEvent.contentOffset.x / w))
            }>
            {pages.map((render, i) => (
              <View key={i} style={{width: w, height: chartHeight}}>
                {render(w)}
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {below}

      <View style={s.footerRow}>
        <Pager count={pages.length} active={page} onPress={go} />
        {showOpen ? (
          <View style={s.openAbs}>
            <OpenButton onPress={onOpen} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Legend({items, boxed}) {
  return (
    <View style={[s.legendRow, boxed && s.legendBoxed]}>
      {items.map(it => (
        <View key={it.label} style={s.legendItem}>
          <View style={[s.legendDot, {backgroundColor: it.color}]} />
          <Text style={s.legendLabel}>{it.label}</Text>
          <Text style={[s.legendValue, it.valueColor && {color: it.valueColor}]}>
            {it.value}
          </Text>
          {it.pct ? <Text style={s.legendPct}>({it.pct})</Text> : null}
        </View>
      ))}
    </View>
  );
}

function StatLine({color, label, value, pct, valueColor}) {
  return (
    <View style={s.statLine}>
      <View style={s.statHead}>
        <View style={[s.legendDot, {backgroundColor: color}]} />
        <Text style={s.legendLabel}>{label}</Text>
      </View>
      <View style={s.statValueRow}>
        <Text style={[s.statValue, {color: valueColor || color}]}>{value}</Text>
        <Text style={s.legendPct}> ({pct})</Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Cards: every card has a Weekly / Monthly / Till Date dropdown.      */
/* The numbers below are sample data: replace each block with the      */
/* response from your API for that period.                             */
/* ------------------------------------------------------------------ */
const sum = a => a.reduce((x, y) => x + y, 0);
const pctOf = (v, total) =>
  `${total ? ((v / total) * 100).toFixed(1) : '0.0'}%`;

/* ---------- Custom date range picker ---------- */
const pad2 = n => String(n).padStart(2, '0');
const toISO = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Params sent to the detail screen when "View" is pressed, so it can fetch
// the same period the card is showing.
//   Today     -> {range: 'today',   from: <today>, to: <today>}
//   Custom    -> {range: 'custom',  from, to}
//   others    -> {range: 'weekly' | 'monthly' | 'till_date'}
const PERIOD_KEY = {
  Today: 'today',
  Weekly: 'weekly',
  Monthly: 'monthly',
  'Till Date': 'till_date',
};
// month label/number ("Oct", "October", 10) -> 1..12 (0 if unknown)
const monthNum = v => {
  const n = Number(v);
  if (n >= 1 && n <= 12) {
    return n;
  }
  const key = String(v || '').slice(0, 3).toLowerCase();
  return MONTHS.findIndex(m => m.toLowerCase() === key) + 1;
};

// The exact from/to dates the card is showing (same as the date under its
// total), so the detail screen fetches the same range.
const cardDates = (period, range, rows, todayISO) => {
  if (period === 'Custom' && range) {
    return {from: range.from, to: range.to};
  }
  if (period === 'Today') {
    const d = toISO(new Date());
    return {from: d, to: d};
  }
  const first = rows && rows[0];
  const last = rows && rows[rows.length - 1];
  if (first?.start_date && last?.end_date) {
    return {from: first.start_date, to: last.end_date};
  }
  const m = monthNum(first?.month_name ?? first?.month);
  const y = first?.year;
  if (m && y) {
    return {from: `${y}-${pad2(m)}-01`, to: todayISO || toISO(new Date())};
  }
  return {};
};

const rangeParams = (period, range, rows, todayISO) => {
  const key = period === 'Custom' ? 'custom' : PERIOD_KEY[period];
  const d = cardDates(period, range, rows, todayISO);
  const out = {range: key, period};
  if (d.from) {
    out.from = d.from;
  }
  if (d.to) {
    out.to = d.to;
  }
  return out;
};

// Tap a start day, then an end day. Apply sends them to the API.
function DateRangeModal({visible, initial, onApply, onClose}) {
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);

  useEffect(() => {
    if (visible) {
      setStart(initial ? initial.from : null);
      setEnd(initial ? initial.to : null);
    }
  }, [visible, initial]);

  const onDay = day => {
    const d = day.dateString;
    if (!start || end) {
      setStart(d); // begin a new range
      setEnd(null);
    } else if (d < start) {
      setStart(d); // tapped before the start: move the start
    } else {
      setEnd(d);
    }
  };

  const marked = useMemo(() => {
    const m = {};
    if (!start) {
      return m;
    }
    const last = end || start;
    const cur = new Date(`${start}T00:00:00`);
    const stop = new Date(`${last}T00:00:00`);
    let guard = 0;
    while (cur <= stop && guard++ < 800) {
      const k = toISO(cur);
      m[k] = {
        color: '#2b7fef',
        textColor: '#fff',
        startingDay: k === start,
        endingDay: k === last,
      };
      cur.setDate(cur.getDate() + 1);
    }
    return m;
  }, [start, end]);

  const summary = start
    ? `${fmtDate(start)}  →  ${end ? fmtDate(end) : 'select end date'}`
    : 'Select a start date';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={s.pickerBackdrop}>
        <View style={s.pickerSheet}>
          <Text style={s.pickerTitle}>Select date range</Text>
          <Text style={s.pickerSummary}>{summary}</Text>
          <Calendar
            markingType="period"
            markedDates={marked}
            onDayPress={onDay}
            maxDate={toISO(new Date())}
            enableSwipeMonths
            // own arrows: avoids the library's PNG images (Metro asset error)
            renderArrow={dir => (
              <Icon
                name={dir === 'left' ? 'chevron-left' : 'chevron-right'}
                size={26}
                color={ACCENT}
              />
            )}
            theme={{
              calendarBackground: 'transparent',
              dayTextColor: '#e2e8f0',
              monthTextColor: '#ffffff',
              textMonthFontWeight: '700',
              arrowColor: ACCENT,
              textDisabledColor: '#475569',
              todayTextColor: ACCENT,
              textSectionTitleColor: '#94a3b8',
            }}
          />
          <View style={s.pickerActions}>
            <TouchableOpacity style={s.pickerBtnGhost} onPress={onClose}>
              <Text style={s.pickerBtnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!start}
              style={[s.pickerBtn, !start && {opacity: 0.4}]}
              onPress={() => onApply({from: start, to: end || start})}>
              <Text style={s.pickerBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ---------- Converted / Site Visit (live API) ---------- */
// Dropdown value -> value sent as ?site_visit_range=
// Monthly is confirmed. Check the other two against your backend.
const RANGE_PARAM = {
  Weekly: 'weekly',
  Monthly: 'monthly',
  'Till Date': 'till_date',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = iso => {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${d} ${MONTHS[Number(m) - 1]}, ${y}` : '';
};

// round the top of the y axis to a clean number (1, 2, 5, 10 x 10^n steps)
const niceMax = (v, ticks = 4) => {
  if (!v || v <= 0) {
    return ticks;
  }
  const raw = v / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  return Math.max(step, 1) * ticks;
};

const labelOf = it =>
  it?.month_name || it?.label || it?.week_label || it?.week || it?.date_range || it?.name || '';
// "till_date" groups months under each year: [{year, months: [...]}].
// Flatten that into one list of {year, month, month_name, ...}.
const flattenGraph = graph => {
  const out = [];
  (graph || []).forEach(it => {
    if (Array.isArray(it?.months)) {
      it.months.forEach(m => out.push({...m, year: m.year ?? it.year}));
    } else if (it) {
      out.push(it);
    }
  });
  return out;
};
const keyOf = it => `${it?.year ?? ''}-${it?.month ?? labelOf(it)}`;

function ConvertedSiteVisitCard() {
  const navigation = useNavigation();
  const [period, setPeriod] = useState('Weekly'); // default: Weekly
  const [range, setRange] = useState(null); // {from, to} for "Custom"
  const [pickerOpen, setPickerOpen] = useState(false);

  // "Custom" opens the date picker first; the other options apply directly
  const onPeriod = p => {
    if (p === 'Custom') {
      // wait for the dropdown menu to close (iOS can't open two modals at once)
      setTimeout(() => setPickerOpen(true), 250);
    } else {
      setPeriod(p);
    }
  };

  const {data, isLoading, isError, isPlaceholderData} = useQuery({
    queryKey: ['siteVisitGraph', period, range?.from, range?.to],
    enabled: period !== 'Custom' || !!range,
    queryFn: async () => {
      const params =
        period === 'Custom'
          ? {
              site_visit_range: 'custom',
              site_visit_from: range.from,
              site_visit_to: range.to,
            }
          : {site_visit_range: RANGE_PARAM[period]};
      const res = await api.get('/api/pm/PropertyCrmDashboardDataWithGraph1', {
        params,
      });
      return res.data?.data;
    },
    placeholderData: keepPreviousData, // v5: keep showing the old chart while the new one loads
  });

  // Animate once per period/range, only when its data is on screen.
  // (Not tied to dataUpdatedAt, so background refetches don't replay it.)
  const animKey = useRef('init');
  if (!isPlaceholderData && data) {
    animKey.current = `${period}:${range?.from || ''}:${range?.to || ''}`;
  }

  const visitG = flattenGraph(data?.siteVisits?.site_visits_graph);
  const convG = flattenGraph(data?.converted?.graph);
  const convValue = x => Number(x?.converted ?? x?.count) || 0; // custom range uses `count`
  const convByKey = new Map(convG.map(x => [keyOf(x), convValue(x)]));

  // add the year to each label only when the data spans more than one year
  const multiYear = new Set(visitG.map(x => x.year)).size > 1;
  const labels = visitG.map(x =>
    multiYear ? `${labelOf(x)} '${String(x.year).slice(-2)}` : labelOf(x),
  );
  const visits = visitG.map(x => Number(x.count) || 0);
  const conv = visitG.map((x, i) =>
    convByKey.has(keyOf(x)) ? convByKey.get(keyOf(x)) : convValue(convG[i]),
  );

  const totalVisit = data?.siteVisits?.site_visits ?? sum(visits);
  const totalConv = data?.converted?.converted ?? sum(conv);
  const yMax = niceMax(Math.max(0, ...visits, ...conv));
  const today = fmtDate(data?.today);
  const date = !labels.length
    ? ''
    : period === 'Custom' && range
    ? `${fmtDate(range.from)} - ${fmtDate(range.to)}`
    : period === 'Weekly'
    ? today
    : `01 ${labelOf(visitG[0])}, ${visitG[0]?.year ?? data?.year} - ${today}`;

  const groups = labels.map((label, i) => ({
    label,
    bars: [
      [{value: visits[i], color: C.orange}],
      [{value: conv[i], color: C.cyan}],
    ],
  }));

  return (
    <>
    <Card
      title="Converted / Site Visit"
      onOpen={() =>
        navigation.navigate('SiteVisitsScreen', rangeParams(period, range, visitG, data?.today))
      }
      total={isLoading ? '…' : `${totalConv} / ${totalVisit}`}
      right={
        <Dropdown
          value={period}
          onChange={onPeriod}
          options={[...PERIODS, 'Custom']}
        />
      }
      date={date}
      replayKey={animKey.current}
      chartHeight={95}
      pages={[
        w => (
          <LineChart
            width={w}
            height={95}
            yMax={yMax}
            ticks={4}
            labels={labels}
            series={[
              {color: C.orange, values: visits},
              {color: C.cyan, values: conv},
            ]}
          />
        ),
        w => (
          <BarChart
            width={w}
            height={95}
            yMax={yMax}
            ticks={4}
            barWidth={9}
            groups={groups}
          />
        ),
      ]}
      below={
        <>
          {isError ? (
            <Text style={s.errorText}>Couldn't load site visits. Pull down to retry.</Text>
          ) : null}
          <View style={s.pillBar}>
            <View style={s.pillItem}>
              <View style={[s.legendDot, {backgroundColor: C.cyan}]} />
              <Text style={s.pillLabel}>Converted</Text>
              <Text style={[s.pillValue, {color: C.cyan}]}>{isLoading ? '…' : totalConv}</Text>
            </View>
            <View style={s.pillItem}>
              <View style={[s.legendDot, {backgroundColor: C.orange}]} />
              <Text style={s.pillLabel}>Site Visit</Text>
              <Text style={[s.pillValue, {color: C.orange}]}>{isLoading ? '…' : totalVisit}</Text>
            </View>
          </View>
        </>
      }
    />
    <DateRangeModal
      visible={pickerOpen}
      initial={range}
      onClose={() => setPickerOpen(false)}
      onApply={r => {
        setRange(r);
        setPeriod('Custom');
        setPickerOpen(false);
      }}
    />
    </>
  );
}

/* ---------- Follow-ups (live API) ---------- */
// Dropdown value -> value sent as ?followup_range=
// Today and Weekly are confirmed. Check the other two against your backend.
const FOLLOWUP_OPTIONS = ['Today', 'Weekly', 'Monthly', 'Till Date'];

// shown in the chart area when there is nothing to draw
function EmptyChart({width, height, text, icon = 'event-available'}) {
  return (
    <View style={{width, height, alignItems: 'center', justifyContent: 'center'}}>
      <Icon name={icon} size={22} color={C.muted} />
      <Text style={{color: C.muted, fontSize: 11, marginTop: 4}}>{text}</Text>
    </View>
  );
}

const FOLLOWUP_RANGE = {
  Today: 'today',
  Weekly: 'weekly',
  Monthly: 'monthly',
  'Till Date': 'till_date',
};

// weekly rows use date_range ("05 Oct - 11 Oct"); monthly rows use month_name
const followLabel = it =>
  it?.date_range || it?.month_name || it?.label || it?.week || it?.name || '';

function FollowUpsCard() {
  const navigation = useNavigation();
  const [period, setPeriod] = useState('Today'); // default: Today

  const {data, isLoading, isError, isPlaceholderData} = useQuery({
    queryKey: ['followupGraph', period],
    queryFn: async () => {
      const res = await api.get('/api/pm/PropertyCrmDashboardDataWithGraph2', {
        params: {followup_range: FOLLOWUP_RANGE[period]},
      });
      return res.data?.data;
    },
    placeholderData: keepPreviousData, // keep the old chart while the new one loads
  });

  // Animate once per period/range, only when its data is on screen.
  // (Not tied to dataUpdatedAt, so background refetches don't replay it.)
  const animKey = useRef('init');
  if (!isPlaceholderData && data) {
    animKey.current = period;
  }

  const f = data?.followups;
  const rows = flattenGraph(f?.graph);
  const labels = rows.map(followLabel);
  const upcomingArr = rows.map(x => Number(x.upcoming) || 0);
  const missedArr = rows.map(x => Number(x.missed) || 0);

  const upcoming = Number(f?.totalUpcoming ?? sum(upcomingArr)) || 0;
  const missed = Number(f?.totalMissedFollowUps ?? sum(missedArr)) || 0;
  const total = upcoming + missed;
  const yMax = niceMax(Math.max(0, ...upcomingArr, ...missedArr));
  const empty = !isLoading && total === 0 && rows.length === 0;

  const first = rows[0];
  const last = rows[rows.length - 1];
  // weekly rows carry start/end dates; monthly rows only have the month
  const date =
    first?.start_date && last?.end_date
      ? `${fmtDate(first.start_date)} - ${fmtDate(last.end_date)}`
      : first?.month_name
      ? `01 ${first.month_name}, ${first.year ?? data?.year} - ${fmtDate(data?.today)}`
      : fmtDate(data?.today);

  const groups = labels.map((label, i) => ({
    label,
    bars: [
      [{value: upcomingArr[i], color: C.green}],
      [{value: missedArr[i], color: C.orange}],
    ],
  }));

  return (
    <Card
      title="Follow-ups"
      onOpen={() =>
        navigation.navigate('FollowUpsScreen', rangeParams(period, null, rows, data?.today))
      }
      total={isLoading ? '…' : String(total)}
      right={
        <Dropdown
          value={period}
          onChange={setPeriod}
          options={FOLLOWUP_OPTIONS}
        />
      }
      date={date}
      replayKey={animKey.current}
      chartHeight={100}
      pages={[
        w => empty ? (
          <EmptyChart width={w} height={100} text="No follow-ups" />
        ) : (
          <PieChart
            width={w}
            height={100}
            slices={[
              {value: upcoming, color: C.green},
              {value: missed, color: C.orange},
            ]}
          />
        ),
        w => empty ? (
          <EmptyChart width={w} height={100} text="No follow-ups" />
        ) : (
          <BarChart
            width={w}
            height={100}
            yMax={yMax}
            ticks={4}
            barWidth={rows.length > 6 ? 9 : 14}
            groups={groups}
          />
        ),
      ]}
      below={
        <>
          {isError ? (
            <Text style={s.errorText}>Couldn't load follow-ups. Pull down to retry.</Text>
          ) : null}
          <Legend
            items={[
              {color: C.green, label: 'Upcoming', value: isLoading ? '…' : String(upcoming), pct: pctOf(upcoming, total), valueColor: C.green},
              {color: C.orange, label: 'Missed', value: isLoading ? '…' : String(missed), pct: pctOf(missed, total), valueColor: C.orange},
            ]}
          />
        </>
      }
    />
  );
}

/* ---------- Lead Analysis (live API) ---------- */
// Dropdown value -> value sent as ?lead_range=
// "today" is confirmed. Check the other three against your backend.
const LEAD_RANGE = {
  Today: 'today',
  Weekly: 'weekly',
  Monthly: 'monthly',
  'Till Date': 'till_date',
};
const LEAD_OPTIONS = ['Today', 'Weekly', 'Monthly', 'Till Date', 'Custom'];

function LeadAnalysisCard() {
  const navigation = useNavigation();
  const [period, setPeriod] = useState('Weekly'); // default: Weekly
  const [range, setRange] = useState(null); // {from, to} for "Custom"
  const [pickerOpen, setPickerOpen] = useState(false);

  // "Custom" opens the date picker first; the other options apply directly
  const onPeriod = p => {
    if (p === 'Custom') {
      // wait for the dropdown menu to close (iOS can't open two modals at once)
      setTimeout(() => setPickerOpen(true), 250);
    } else {
      setPeriod(p);
    }
  };

  const {data, isLoading, isError, isPlaceholderData} = useQuery({
    queryKey: ['leadGraph', period, range?.from, range?.to],
    enabled: period !== 'Custom' || !!range,
    queryFn: async () => {
      const params =
        period === 'Custom'
          ? {lead_range: 'custom', lead_from: range.from, lead_to: range.to}
          : {lead_range: LEAD_RANGE[period]};
      const res = await api.get('/api/pm/PropertyCrmDashboardDataWithGraph3', {
        params,
      });
      return res.data?.data;
    },
    placeholderData: keepPreviousData, // keep the old chart while the new one loads
  });

  // Animate once per period/range, only when its data is on screen.
  // (Not tied to dataUpdatedAt, so background refetches don't replay it.)
  const animKey = useRef('init');
  if (!isPlaceholderData && data) {
    animKey.current = `${period}:${range?.from || ''}:${range?.to || ''}`;
  }

  const L = data?.leads;
  const rows = flattenGraph(L?.graph);
  const labels = rows.map(followLabel);
  const activeArr = rows.map(x => Number(x.active) || 0);
  const inactiveArr = rows.map(x => Number(x.inactive) || 0);
  const convArr = rows.map(x => Number(x.converted) || 0);

  const tConv = Number(L?.converted ?? sum(convArr)) || 0;
  const tActive = Number(L?.active ?? sum(activeArr)) || 0;
  const tInactive = Number(L?.inactive ?? sum(inactiveArr)) || 0;
  const total = Number(L?.total ?? tConv + tActive + tInactive) || 0;

  const peak = Math.max(
    0,
    ...rows.map((_, i) => activeArr[i] + inactiveArr[i] + convArr[i]),
    ...activeArr,
  );
  const yMax = niceMax(peak);
  const empty = !isLoading && total === 0 && rows.length === 0;

  const first = rows[0];
  const last = rows[rows.length - 1];
  const date =
    period === 'Custom' && range
      ? `${fmtDate(range.from)} - ${fmtDate(range.to)}`
      : first?.start_date && last?.end_date
      ? `${fmtDate(first.start_date)} - ${fmtDate(last.end_date)}`
      : first?.month_name
      ? `01 ${first.month_name}, ${first.year ?? data?.year} - ${fmtDate(data?.today)}`
      : fmtDate(data?.today);

  const groups = labels.map((label, i) => ({
    label,
    segments: [
      {value: inactiveArr[i], color: C.red},
      {value: activeArr[i], color: C.green},
      {value: convArr[i], color: C.cyan},
    ],
  }));
  const show = v => (isLoading ? '…' : String(v));

  return (
    <>
    <Card
      title="Lead Analysis"
      onOpen={() =>
        navigation.navigate('TotalLeadScreen', rangeParams(period, range, rows, data?.today))
      }
      total={show(total)}
      right={
        <Dropdown
          value={period}
          onChange={onPeriod}
          options={LEAD_OPTIONS}
        />
      }
      date={date}
      replayKey={animKey.current}
      chartHeight={105}
      pages={[
        w => empty ? (
          <EmptyChart width={w} height={105} text="No leads" icon="people-outline" />
        ) : (
          <BarChart
            width={w}
            height={105}
            yMax={yMax}
            ticks={4}
            barWidth={rows.length > 6 ? 12 : 16}
            groups={groups}
          />
        ),
        w => empty ? (
          <EmptyChart width={w} height={105} text="No leads" icon="people-outline" />
        ) : (
          <LineChart
            width={w}
            height={105}
            yMax={yMax}
            ticks={4}
            labels={labels}
            series={[
              {color: C.red, values: inactiveArr},
              {color: C.cyan, values: convArr},
              {color: C.green, values: activeArr},
            ]}
          />
        ),
      ]}
      below={
        <>
          {isError ? (
            <Text style={s.errorText}>Couldn't load leads. Pull down to retry.</Text>
          ) : null}
          <View style={s.statsWrap}>
            <StatLine color={C.cyan} label="Converted" value={show(tConv)} pct={pctOf(tConv, total)} />
            <StatLine color={C.green} label="Active" value={show(tActive)} pct={pctOf(tActive, total)} />
            <StatLine color={C.red} label="Inactive" value={show(tInactive)} pct={pctOf(tInactive, total)} />
          </View>
        </>
      }
    />
    <DateRangeModal
      visible={pickerOpen}
      initial={range}
      onClose={() => setPickerOpen(false)}
      onApply={r => {
        setRange(r);
        setPeriod('Custom');
        setPickerOpen(false);
      }}
    />
    </>
  );
}

/* ---------- Revenue Analysis (live API) ---------- */
// Dropdown value -> value sent as ?booking_range=
// Weekly and custom are confirmed. Check the other two against your backend.
const BOOKING_RANGE = {
  Weekly: 'weekly',
  Monthly: 'monthly',
  'Till Date': 'till_date',
};
const BOOKING_OPTIONS = ['Weekly', 'Monthly', 'Till Date', 'Custom'];

// 33000000 -> ₹3,30,00,000 (Indian digit grouping, no Intl needed)
const inr = n => {
  const v = Number(n) || 0;
  const [whole, frac] = (Math.abs(v) % 1 ? Math.abs(v).toFixed(2) : String(Math.abs(v))).split('.');
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;
  return `₹${v < 0 ? '-' : ''}${grouped}${frac ? `.${frac}` : ''}`;
};

function RevenueCard() {
  const navigation = useNavigation();
  const [period, setPeriod] = useState('Weekly'); // default: Weekly
  const [range, setRange] = useState(null); // {from, to} for "Custom"
  const [pickerOpen, setPickerOpen] = useState(false);

  // "Custom" opens the date picker first; the other options apply directly
  const onPeriod = p => {
    if (p === 'Custom') {
      // wait for the dropdown menu to close (iOS can't open two modals at once)
      setTimeout(() => setPickerOpen(true), 250);
    } else {
      setPeriod(p);
    }
  };

  const {data, isLoading, isError, isPlaceholderData} = useQuery({
    queryKey: ['bookingGraph', period, range?.from, range?.to],
    enabled: period !== 'Custom' || !!range,
    queryFn: async () => {
      const params =
        period === 'Custom'
          ? {booking_range: 'custom', booking_from: range.from, booking_to: range.to}
          : {booking_range: BOOKING_RANGE[period]};
      const res = await api.get('/api/pm/PropertyCrmDashboardDataWithGraph4', {
        params,
      });
      return res.data?.data;
    },
    placeholderData: keepPreviousData, // keep the old chart while the new one loads
  });

  // Animate once per period/range, only when its data is on screen.
  // (Not tied to dataUpdatedAt, so background refetches don't replay it.)
  const animKey = useRef('init');
  if (!isPlaceholderData && data) {
    animKey.current = `${period}:${range?.from || ''}:${range?.to || ''}`;
  }

  const B = data?.bookingData;
  const rows = flattenGraph(B?.graph);
  const labels = rows.map(followLabel);
  const counts = rows.map(x => Number(x.booking_count) || 0);

  const totalBookings = Number(B?.total ?? sum(counts)) || 0;
  const yMax = niceMax(Math.max(0, ...counts));
  const empty = !isLoading && totalBookings === 0 && rows.length === 0;

  const first = rows[0];
  const last = rows[rows.length - 1];
  const date =
    period === 'Custom' && range
      ? `${fmtDate(range.from)} - ${fmtDate(range.to)}`
      : first?.start_date && last?.end_date
      ? `${fmtDate(first.start_date)} - ${fmtDate(last.end_date)}`
      : first?.month_name
      ? `01 ${first.month_name}, ${first.year ?? data?.year} - ${fmtDate(data?.today)}`
      : fmtDate(data?.today);

  const dash = v => (isLoading ? '…' : v);

  return (
    <>
    <Card
      title="Revenue Analysis"
      onOpen={() =>
        navigation.navigate(
          'TotalBookingsAgreementsTillDateScreen',
          rangeParams(period, range, rows, data?.today),
        )
      }
      total=""
      totalLabel=""
      right={
        <Dropdown
          value={period}
          onChange={onPeriod}
          options={BOOKING_OPTIONS}
        />
      }
      date={date}
      replayKey={animKey.current}
      chartHeight={90}
      pages={[
        w => empty ? (
          <EmptyChart width={w} height={90} text="No bookings" icon="receipt-long" />
        ) : (
          <LineChart
            width={w}
            height={90}
            yMax={yMax}
            ticks={rows.length ? 2 : 4}
            labels={labels}
            series={[{color: C.orange, values: counts}]}
          />
        ),
        w => empty ? (
          <EmptyChart width={w} height={90} text="No bookings" icon="receipt-long" />
        ) : (
          <BarChart
            width={w}
            height={90}
            yMax={yMax}
            ticks={rows.length ? 2 : 4}
            barWidth={rows.length > 5 ? 12 : 14}
            groups={labels.map((label, i) => ({
              label,
              segments: [{value: counts[i], color: C.orange}],
            }))}
          />
        ),
      ]}
      below={
        <>
          {isError ? (
            <Text style={s.errorText}>Couldn't load bookings. Pull down to retry.</Text>
          ) : null}
          <View style={s.revenueList}>
            <View style={s.revenueRow}>
              <View style={[s.legendDot, {backgroundColor: C.orange}]} />
              <Text style={[s.revenueText, {color: C.orange}]}>
                Total Number of Bookings : {dash(totalBookings)}
              </Text>
            </View>
            <View style={s.revenueRow}>
              <View style={[s.legendDot, {backgroundColor: C.cyan}]} />
              <Text style={[s.revenueText, {color: C.cyan}]}>
                Total Agreements : {dash(inr(B?.agreement_value))}
              </Text>
            </View>
            <View style={s.revenueRow}>
              <View style={[s.legendDot, {backgroundColor: C.green}]} />
              <Text style={[s.revenueText, {color: C.green}]}>
                Total Brokerage : {dash(inr(B?.brokerage_value))}
              </Text>
            </View>
          </View>
        </>
      }
    />
    <DateRangeModal
      visible={pickerOpen}
      initial={range}
      onClose={() => setPickerOpen(false)}
      onApply={r => {
        setRange(r);
        setPeriod('Custom');
        setPickerOpen(false);
      }}
    />
    </>
  );
}

/* ---------- All Assigned Leads (live API) ---------- */
// Dropdown value -> value sent as ?range=
// "today" and "custom" are confirmed from your API docs.
// Check weekly / monthly / till_date against your backend.
const ASSIGNED_RANGE = {
  Today: 'today',
  Weekly: 'weekly',
  Monthly: 'monthly',
  'Till Date': 'till_date',
};
const ASSIGNED_OPTIONS = ['Today', 'Weekly', 'Monthly', 'Till Date', 'Custom'];

function AllAssignedLeadsCard() {
  const [period, setPeriod] = useState('Monthly'); // default: Monthly
  const [range, setRange] = useState(null); // {from, to} for "Custom"
  const [pickerOpen, setPickerOpen] = useState(false);

  // "Custom" opens the date picker first; the other options apply directly
  const onPeriod = p => {
    if (p === 'Custom') {
      // wait for the dropdown menu to close (iOS can't open two modals at once)
      setTimeout(() => setPickerOpen(true), 250);
    } else {
      setPeriod(p);
    }
  };

  const {data, isLoading, isError, isPlaceholderData} = useQuery({
    queryKey: ['rmLeadGraph', period, range?.from, range?.to],
    enabled: period !== 'Custom' || !!range,
    queryFn: async () => {
      const params =
        period === 'Custom'
          ? {range: 'custom', from: range.from, to: range.to}
          : {range: ASSIGNED_RANGE[period]};
      const res = await api.get('/api/pm/RMLeadGraph', {params});
      return res.data; // this API is not wrapped in {data: {...}} for the totals
    },
    placeholderData: keepPreviousData, // keep the old chart while the new one loads
  });

  // Replay the chart animation only when the NEW data arrives.
  // While the old chart is kept on screen (placeholder), the key stays the
  // same, so the animation does not play twice.
  const animKey = useRef('init');
  // The key uses period/range only (not dataUpdatedAt), so a background
  // refetch of cached data does not trigger a second animation.
  if (!isPlaceholderData && data) {
    animKey.current = `${period}:${range?.from || ''}:${range?.to || ''}`;
  }

  // rm_data lives at data[0].rm_data
  const rms = data?.data?.[0]?.rm_data || [];
  // "SUJAY KUMAR  SINGHA" -> "SUJAY" (first name only, fits under the bars)
  const names = rms.map(r => String(r.rm_name || '').trim().split(/\s+/)[0]);
  const inactiveArr = rms.map(r => Number(r.inactive) || 0);
  const activeArr = rms.map(r => Number(r.active) || 0);
  const convArr = rms.map(r => Number(r.converted) || 0);

  const tConv = Number(data?.converted_leads ?? sum(convArr)) || 0;
  const tActive = Number(data?.active_leads ?? sum(activeArr)) || 0;
  const tInactive = Number(data?.inactive_leads ?? sum(inactiveArr)) || 0;
  const total = Number(data?.total_leads ?? tConv + tActive + tInactive) || 0;

  const peak = Math.max(
    0,
    ...rms.map((_, i) => inactiveArr[i] + activeArr[i] + convArr[i]),
  );
  const yMax = niceMax(peak);
  const empty = !isLoading && total === 0;

  const date =
    period === 'Custom' && range
      ? `${fmtDate(range.from)} - ${fmtDate(range.to)}`
      : period === 'Today'
      ? fmtDate(data?.today)
      : data?.from && data?.to
      ? `${fmtDate(data.from)} - ${fmtDate(data.to)}`
      : fmtDate(data?.today);

  const groups = names.map((label, i) => ({
    label,
    segments: [
      {value: inactiveArr[i], color: C.red},
      {value: activeArr[i], color: C.green},
      {value: convArr[i], color: C.cyan},
    ],
  }));
  const show = v => (isLoading ? '…' : String(v));

  return (
    <>
      <Card
        title="All Assigned Leads"
        total={show(total)}
        totalLabel="Total Leads"
        right={
          <Dropdown
            value={period}
            onChange={onPeriod}
            options={ASSIGNED_OPTIONS}
          />
        }
        date={date}
        replayKey={animKey.current}
        chartHeight={115}
        showOpen={false}
        pages={[
          w =>
            empty ? (
              <EmptyChart width={w} height={115} text="No leads" icon="people-outline" />
            ) : (
              <BarChart
                width={w}
                height={115}
                yMax={yMax}
                ticks={4}
                barWidth={16}
                rotate={-25}
                labelSize={8}
                groups={groups}
              />
            ),
          w =>
            empty ? (
              <EmptyChart width={w} height={115} text="No leads" icon="people-outline" />
            ) : (
              <LineChart
                width={w}
                height={115}
                yMax={yMax}
                ticks={4}
                labels={names}
                series={[
                  {color: C.red, values: inactiveArr},
                  {color: C.cyan, values: convArr},
                  {color: C.green, values: activeArr},
                ]}
              />
            ),
        ]}
        below={
          <>
            {isError ? (
              <Text style={s.errorText}>
                Couldn't load assigned leads. Pull down to retry.
              </Text>
            ) : null}
            <Legend
              boxed
              items={[
                {color: C.cyan, label: 'Converted', value: show(tConv), pct: pctOf(tConv, total), valueColor: C.cyan},
                {color: C.green, label: 'Active', value: show(tActive), pct: pctOf(tActive, total), valueColor: C.green},
                {color: C.red, label: 'Inactive', value: show(tInactive), pct: pctOf(tInactive, total), valueColor: C.red},
              ]}
            />
          </>
        }
      />
      <DateRangeModal
        visible={pickerOpen}
        initial={range}
        onClose={() => setPickerOpen(false)}
        onApply={r => {
          setRange(r);
          setPeriod('Custom');
          setPickerOpen(false);
        }}
      />
    </>
  );
}

/* ---------- RM detail card (live API) ---------- */
// Calls /api/pm/getRmDetailLeadGraph?rm_id=...&range=...
// "today" and "custom" are confirmed from your API docs.
// Check weekly / monthly / till_date against your backend.
const AGENT_RM_ID = 1111; // SUJAY KUMAR SINGHA
const AGENT_RANGE = {
  Today: 'today',
  Weekly: 'weekly',
  Monthly: 'monthly',
  'Till Date': 'till_date',
};
const AGENT_OPTIONS = ['Today', 'Weekly', 'Monthly', 'Till Date', 'Custom'];

const cleanName = n => String(n || '').replace(/\s+/g, ' ').trim();

const AVATAR_COLORS = ['#2d8ee0', '#7cb35a', '#f0a64b', '#a44848', '#8e6fd8', '#1aa7a1'];
const initialsOf = n => {
  const parts = cleanName(n).split(' ').filter(Boolean);
  return (
    (parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')
  ).toUpperCase();
};

// returns the current keyboard height (0 when hidden)
function useKeyboardHeight() {
  const [h, setH] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(showEvt, e => setH(e.endCoordinates.height));
    const b = Keyboard.addListener(hideEvt, () => setH(0));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  return h;
}

// Card title that opens a searchable bottom sheet of RMs.
// Works well with 100+ users: fixed-height sheet, search box, FlatList.
function RmPicker({rms, valueId, name, onChange}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const listRef = useRef(null);
  const insets = useSafeAreaInsets();
  const {height: winH} = useWindowDimensions();
  const kb = useKeyboardHeight();

  const close = () => {
    Keyboard.dismiss();
    setOpen(false);
    setQuery('');
  };

  // Sheet is 75% of the screen normally. When the iOS keyboard is open it
  // shrinks to the space that is left above the keyboard, so the header and
  // search box are never pushed off the top.
  const baseH = winH * 0.75;
  const isIOS = Platform.OS === 'ios';
  const sheetH =
    isIOS && kb > 0
      ? Math.min(baseH, winH - kb - insets.top - 12)
      : baseH;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return rms;
    }
    return rms.filter(
      r =>
        cleanName(r.rm_name).toLowerCase().includes(q) ||
        String(r.rm_id).includes(q),
    );
  }, [rms, query]);

  const renderItem = ({item}) => {
    const active = Number(item.rm_id) === Number(valueId);
    const nm = cleanName(item.rm_name);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={[rp.row, active && rp.rowActive]}
        onPress={() => {
          onChange(Number(item.rm_id));
          close();
        }}>
        <View
          style={[
            rp.avatar,
            {backgroundColor: AVATAR_COLORS[Number(item.rm_id) % AVATAR_COLORS.length]},
          ]}>
          <Text style={rp.avatarText}>{initialsOf(nm)}</Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={[rp.name, active && rp.nameActive]} numberOfLines={1}>
            {nm}
          </Text>
          <Text style={rp.sub}>ID: {item.rm_id}</Text>
        </View>
        {active ? <Icon name="check-circle" size={20} color={ACCENT} /> : null}
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* Title button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => rms.length && setOpen(true)}
        style={rp.trigger}>
        <Icon name="person" size={14} color={C.muted} />
        <Text style={[s.cardTitle, {flexShrink: 1}]} numberOfLines={1}>
          {name}
        </Text>
        <Icon name="unfold-more" size={16} color={C.text} />
      </TouchableOpacity>

      <Modal
        transparent
        visible={open}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={close}>
        <View style={rp.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />

          <View
            style={[
              rp.sheet,
              {
                height: sheetH,
                // lift the sheet above the iOS keyboard
                marginBottom: isIOS ? kb : 0,
                paddingBottom: isIOS && kb === 0 ? insets.bottom : 0,
              },
            ]}>
            <View style={rp.handle} />

            <View style={rp.headRow}>
              <View style={{flex: 1}}>
                <Text style={rp.title}>Select RM</Text>
                <Text style={rp.count}>
                  {filtered.length === rms.length
                    ? `${rms.length} RMs`
                    : `${filtered.length} of ${rms.length} RMs`}
                </Text>
              </View>
              <TouchableOpacity onPress={close} hitSlop={10} style={rp.closeBtn}>
                <Icon name="close" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={rp.searchBox}>
              <Icon name="search" size={18} color={C.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by name or ID"
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={rp.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                onSubmitEditing={Keyboard.dismiss}
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
                  <Icon name="cancel" size={16} color={C.muted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* List */}
            <FlatList
              ref={listRef}
              data={filtered}
              keyExtractor={r => String(r.rm_id)}
              renderItem={renderItem}
              style={{flex: 1}}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={isIOS ? 'on-drag' : 'none'}
              showsVerticalScrollIndicator={false}
              initialNumToRender={15}
              windowSize={7}
              contentContainerStyle={{paddingBottom: 16}}
              ListEmptyComponent={
                <View style={rp.empty}>
                  <Icon name="person-search" size={36} color={C.muted} />
                  <Text style={rp.emptyText}>No RM found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const rp = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginRight: 8,
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: 'rgba(24,34,52,0.99)',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 10,
  },
  headRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  title: {color: '#fff', fontSize: 16, fontWeight: '700'},
  count: {color: '#94a3b8', fontSize: 11, marginTop: 2},
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    height: 42,
    marginBottom: 8,
  },
  searchInput: {flex: 1, color: '#fff', fontSize: 14, paddingVertical: 0},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  rowActive: {backgroundColor: 'rgba(7,166,246,0.16)'},
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {color: '#fff', fontSize: 13, fontWeight: '700'},
  name: {color: '#e2e8f0', fontSize: 14, fontWeight: '600'},
  nameActive: {color: '#fff', fontWeight: '700'},
  sub: {color: '#94a3b8', fontSize: 10, marginTop: 1},
  empty: {alignItems: 'center', paddingVertical: 40, gap: 8},
  emptyText: {color: C.muted, fontSize: 13},
});

// this API labels rows with `month` ("Oct"); weekly rows may use date_range
const agentLabel = it =>
  it?.date_range ||
  it?.week_label ||
  it?.label ||
  it?.month_name ||
  it?.month ||
  it?.name ||
  '';

function AgentCard() {
  const [period, setPeriod] = useState('Monthly'); // default: Monthly
  const [range, setRange] = useState(null); // {from, to} for "Custom"
  const [pickerOpen, setPickerOpen] = useState(false);
  const [rmId, setRmId] = useState(AGENT_RM_ID); // selected RM

  // RM list for the picker (same API as All Assigned Leads; the list of RMs
  // is returned for any range, "today" is the confirmed one)
  const {data: rmList} = useQuery({
    queryKey: ['rmList'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const res = await api.get('/api/pm/RMLeadGraph', {
        params: {range: 'today'},
      });
      return res.data?.data?.[0]?.rm_data || [];
    },
  });
  const rms = rmList || [];

  // "Custom" opens the date picker first; the other options apply directly
  const onPeriod = p => {
    if (p === 'Custom') {
      // wait for the dropdown menu to close (iOS can't open two modals at once)
      setTimeout(() => setPickerOpen(true), 250);
    } else {
      setPeriod(p);
    }
  };

  const {data, isLoading, isError, isPlaceholderData} = useQuery({
    queryKey: ['rmDetailGraph', rmId, period, range?.from, range?.to],
    enabled: period !== 'Custom' || !!range,
    queryFn: async () => {
      const params =
        period === 'Custom'
          ? {rm_id: rmId, range: 'custom', from: range.from, to: range.to}
          : {rm_id: rmId, range: AGENT_RANGE[period]};
      const res = await api.get('/api/pm/getRmDetailLeadGraph', {params});
      return res.data; // not wrapped in {data: {...}}
    },
    placeholderData: keepPreviousData, // keep the old chart while the new one loads
  });

  // Animate once per period/range, only when its data is on screen.
  const animKey = useRef('init');
  if (!isPlaceholderData && data) {
    animKey.current = `${rmId}:${period}:${range?.from || ''}:${range?.to || ''}`;
  }

  const rows = flattenGraph(data?.data);
  const labels = rows.map(agentLabel);
  const convArr = rows.map(x => Number(x.converted_leads ?? x.converted) || 0);
  const actArr = rows.map(x => Number(x.active_leads ?? x.active) || 0);
  const inactArr = rows.map(x => Number(x.inactive_leads ?? x.inactive) || 0);

  const S = data?.summary;
  const tConv = Number(S?.converted_leads ?? sum(convArr)) || 0;
  const tActive = Number(S?.active_leads ?? sum(actArr)) || 0;
  const tInactive = Number(S?.inactive_leads ?? sum(inactArr)) || 0;
  const total = Number(S?.total_leads ?? tConv + tActive + tInactive) || 0;

  const yMax = niceMax(Math.max(0, ...convArr, ...actArr, ...inactArr));
  const empty = !isLoading && total === 0 && rows.length === 0;

  const first = rows[0];
  const last = rows[rows.length - 1];
  const date =
    period === 'Custom' && range
      ? `${fmtDate(range.from)} - ${fmtDate(range.to)}`
      : period === 'Today'
      ? fmtDate(data?.today)
      : first?.start_date && last?.end_date
      ? `${fmtDate(first.start_date)} - ${fmtDate(last.end_date)}`
      : data?.from && data?.to
      ? `${fmtDate(data.from)} - ${fmtDate(data.to)}`
      : fmtDate(data?.today);

  // selected RM's name: from the list first, then from the response
  const selected = rms.find(r => Number(r.rm_id) === Number(rmId));
  const name = cleanName(selected?.rm_name || data?.rm_name) || 'Select RM';
  const show = v => (isLoading ? '…' : String(v));

  const groups = labels.map((label, i) => ({
    label,
    bars: [
      [{value: convArr[i], color: C.cyan}],
      [{value: actArr[i], color: C.green}],
      [{value: inactArr[i], color: C.red}],
    ],
  }));

  return (
    <>
      <Card
        title={
          <RmPicker
            rms={rms}
            valueId={rmId}
            name={name}
            onChange={setRmId}
          />
        }
        total={show(total)}
        totalLabel="Total Leads"
        right={
          <Dropdown
            value={period}
            onChange={onPeriod}
            options={AGENT_OPTIONS}
          />
        }
        date={date}
        replayKey={animKey.current}
        chartHeight={115}
        showOpen={false}
        pages={[
          w =>
            empty ? (
              <EmptyChart width={w} height={115} text="No leads" icon="people-outline" />
            ) : (
              <BarChart
                width={w}
                height={115}
                yMax={yMax}
                ticks={4}
                barWidth={rows.length > 4 ? 6 : 8}
                rotate={rows.length > 4 ? -20 : 0}
                labelSize={8}
                groups={groups}
              />
            ),
          w =>
            empty ? (
              <EmptyChart width={w} height={115} text="No leads" icon="people-outline" />
            ) : (
              <LineChart
                width={w}
                height={115}
                yMax={yMax}
                ticks={4}
                labels={labels}
                series={[
                  {color: C.red, values: inactArr},
                  {color: C.cyan, values: convArr},
                  {color: C.green, values: actArr},
                ]}
              />
            ),
        ]}
        below={
          <>
            {isError ? (
              <Text style={s.errorText}>
                Couldn't load RM leads. Pull down to retry.
              </Text>
            ) : null}
            <Legend
              boxed
              items={[
                {color: C.cyan, label: 'Converted', value: show(tConv), pct: pctOf(tConv, total), valueColor: C.cyan},
                {color: C.green, label: 'Active', value: show(tActive), pct: pctOf(tActive, total), valueColor: C.green},
                {color: C.red, label: 'Inactive', value: show(tInactive), pct: pctOf(tInactive, total), valueColor: C.red},
              ]}
            />
          </>
        }
      />
      <DateRangeModal
        visible={pickerOpen}
        initial={range}
        onClose={() => setPickerOpen(false)}
        onApply={r => {
          setRange(r);
          setPeriod('Custom');
          setPickerOpen(false);
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */
export default function Dashboard2() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [runKey, setRunKey] = useState(0); // bump to replay the animations

  // Same call as the old dashboard. Swap in the endpoint(s) that feed the charts.
  const {isLoading, isError, refetch} = useQuery({
    queryKey: ['dashboardCards'],
    queryFn: async () => {
      const res = await api.get('/api/pm/PropertyCrmDashboardData');
      return res.data?.data;
    },
  });

  // Scroll position, viewport height and "data ready" flag, shared with every card
  const scrollY = useSharedValue(0);
  const viewH = useSharedValue(0);
  const ready = useSharedValue(0);
  useEffect(() => {
    ready.value = isLoading ? 0 : 1;
  }, [isLoading, ready]);
  const scrollCtx = useMemo(
    () => ({scrollY, viewH, ready}),
    [scrollY, viewH, ready],
  );
  const onScroll = useAnimatedScrollHandler(e => {
    scrollY.value = e.contentOffset.y;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
    setRunKey(k => k + 1);
  };

  const bottomNavHeight = 60 + insets.bottom;

  // Gap above the first card. Set TOP_EXTRA to match the previous pages.
  // The scroll area itself starts at the very top, so the gap scrolls away
  // with the content instead of cutting cards off with a hard edge.
  // The app header is already above this screen, so no safe-area inset here.
  const TOP_EXTRA = 14;
  const TOP_GAP = TOP_EXTRA;

  return (
    <View style={s.root}>
      {/* Same background as the other screens */}
      <Image
        source={require('../asset/image/bg-img.png')}
        style={s.bgImageFixed}
        resizeMode="cover"
        resizeMethod="resize"
        fadeDuration={0}
      />
      <View style={s.overlay} />

      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={e => {
          viewH.value = e.nativeEvent.layout.height;
        }}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        directionalLockEnabled
        alwaysBounceHorizontal={false}
        decelerationRate="normal"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scroll,
          {paddingTop: TOP_GAP, paddingBottom: bottomNavHeight + 10},
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#e3e5e4"
            colors={['#000000']}
            progressBackgroundColor="#ffffff"
          />
        }>
        {/* Section heading */}
        <View style={s.sectionHeader}>
          <View style={s.sectionDot} />
          <Text style={s.sectionTitle}>Dashboard</Text>
          <View style={s.sectionLine} />
          {isLoading ? (
            <ActivityIndicator
              size="small"
              color="#94a3b8"
              style={{marginLeft: 10}}
            />
          ) : null}
        </View>
        {isError ? (
          <Text style={s.errorText}>
            Couldn't load data. Pull down to try again.
          </Text>
        ) : null}

        <ScrollCtx.Provider value={scrollCtx}>
          {[
            ConvertedSiteVisitCard,
            FollowUpsCard,
            LeadAnalysisCard,
            RevenueCard,
            AllAssignedLeadsCard,
            AgentCard,
          ].map((CardComp, i) => (
            <Reveal key={`${runKey}-${i}`}>
              <CardComp />
            </Reveal>
          ))}
        </ScrollCtx.Provider>
      </Animated.ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */
const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#1a2d3e'},
  bgImageFixed: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: Dimensions.get('window').width,
    height: Dimensions.get('screen').height,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: Dimensions.get('window').width,
    height: Dimensions.get('screen').height,
    backgroundColor: 'rgba(18,32,48,0.72)',
  },
  scroll: {paddingHorizontal: 14, gap: 8},

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#07a6f6',
    marginRight: 8,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  errorText: {color: '#f87171', fontSize: 11, marginBottom: 4},
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginLeft: 10,
  },

  card: {
    backgroundColor:
      Platform.OS === 'ios'
        ? 'rgba(255,255,255,0.22)'
        : 'rgba(233,225,225,0.36)',
    borderColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {color: C.text, fontSize: 12, fontWeight: '700'},
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 3,
    gap: 5,
  },
  total: {color: C.text, fontSize: 17, fontWeight: '700'},
  totalLabel: {color: C.muted, fontSize: 9},
  date: {color: C.muted, fontSize: 9, textDecorationLine: 'underline'},

  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderWidth: 1,
    borderRadius: 16,
    paddingLeft: 7,
    paddingRight: 4,
    paddingVertical: 3,
    gap: 4,
  },
  dropdownOpen: {
    borderColor: '#07a6f6',
    backgroundColor: 'rgba(7,166,246,0.18)',
  },
  dropdownText: {color: C.text, fontSize: 11, fontWeight: '600'},

  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  pickerSheet: {
    backgroundColor: 'rgba(24,34,52,0.99)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
  },
  pickerTitle: {color: '#fff', fontSize: 15, fontWeight: '700'},
  pickerSummary: {color: '#94a3b8', fontSize: 12, marginTop: 4, marginBottom: 6},
  pickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  pickerBtnGhost: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  pickerBtnGhostText: {color: '#cbd5e1', fontSize: 13, fontWeight: '600'},
  pickerBtn: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#2b7fef',
  },
  pickerBtnText: {color: '#fff', fontSize: 13, fontWeight: '700'},

  menu: {
    position: 'absolute',
    backgroundColor: 'rgba(24,34,52,0.98)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 6,
    elevation: 24,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
  },
  menuArrow: {
    position: 'absolute',
    top: -6,
    width: 12,
    height: 12,
    backgroundColor: 'rgba(24,34,52,0.98)',
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    transform: [{rotate: '45deg'}],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
  },
  menuItemActive: {backgroundColor: 'rgba(7,166,246,0.16)'},
  menuText: {flex: 1, color: '#cbd5e1', fontSize: 13, fontWeight: '500'},
  menuTextActive: {color: '#fff', fontWeight: '700'},

  pager: {flexDirection: 'row', gap: 5, alignItems: 'center'},
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {width: 20, backgroundColor: C.text},
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 26,
  },
  openAbs: {position: 'absolute', right: 0},
  openShadow: {
    borderRadius: 18,
    elevation: 4,
    shadowColor: '#1d6fe0',
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 3},
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    // backgroundColor: '#2b7fef',
    paddingLeft: 14,
    paddingRight: 3,
    paddingVertical: 3,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  // light strip on the top half gives the button a glossy look
  openGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  openBtnArrow: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBtnText: {color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.4},

  pillBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: C.glassStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 2,
  },
  pillItem: {flexDirection: 'row', alignItems: 'center', gap: 6},
  pillLabel: {color: C.text, fontSize: 11},
  pillValue: {color: C.text, fontSize: 13, fontWeight: '700'},

  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  legendBoxed: {
    backgroundColor: C.glassStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    justifyContent: 'center',
    gap: 8, // space between Converted / Active / Inactive
  },
  legendItem: {flexDirection: 'row', alignItems: 'center', gap: 5},
  legendDot: {width: 8, height: 8, borderRadius: 4},
  legendLabel: {color: C.muted, fontSize: 10},
  legendValue: {color: C.text, fontSize: 12, fontWeight: '700'},
  legendPct: {color: C.muted, fontSize: 9},

  statsWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 8,
  },
  statLine: {flex: 1},
  statHead: {flexDirection: 'row', alignItems: 'center', gap: 5},
  statValueRow: {flexDirection: 'row', alignItems: 'baseline', marginTop: 2},
  statValue: {color: C.text, fontSize: 14, fontWeight: '700'},

  revenueList: {gap: 3, marginTop: 4},
  revenueRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  revenueText: {fontSize: 10, fontWeight: '600'},
});