import { legacy_createStore as createStore } from "redux";

// Default initial state
const initialState = {
  sidebarShow: true,
  theme: "light",
  rightSidebarShow: true,
  sidebarUnfoldable: false,
  hoveredDropdownItems: [],
  isLight: "",
  token: null,
  userRole: null,
  userInfo: null,
  checkDiscussionType: null,
  totalNoOfDiscussion: 0,
  totalNoOfNotification: 0,
  allNotifications: {
    task: 0,
    assigned: 0,
    message: 0,
    file: 0,
    paymentStatus: 0,
  },
  disacussionDetailsAccordion: "1",
  replyMessage: null,

  // ✅ NEW
  isLoggedIn: false,
  unreadCounts: {
    assigned_lead: 0,
    follow_up_date: 0,
    site_visit_date: 0,
  },
};

const changeState = (state = initialState, { type, payload }) => {
  switch (type) {
    case "set":
      return { ...state, ...payload };

    case "setHoveredDropdownItems":
      return { ...state, hoveredDropdownItems: payload };

    case "clearHoveredDropdownItems":
      return { ...state, hoveredDropdownItems: [] };

    case "setColorMode":
      return { ...state, isLight: payload };

    case "setToken":
      return { ...state, token: payload };

    case "setRole":
      return { ...state, userRole: payload };

    case "setUserInfo":
      return { ...state, userInfo: payload };

    case "setDiscussionType":
      return { ...state, checkDiscussionType: payload };

    case "setTotalDiscussion":
      return { ...state, totalNoOfDiscussion: payload };

    case "setTotalNotification":
      return { ...state, totalNoOfNotification: payload };

    case "setAllTypeOfNotifications":
      return { ...state, allNotifications: payload };

    case "setDiscussionDetailsAccordion":
      return { ...state, disacussionDetailsAccordion: payload };

    case "setReplyMessage":
      return { ...state, replyMessage: payload };

    case "clearReplyMessage":
      return { ...state, replyMessage: null };

    // ✅ NEW
    case "SET_UNREAD_COUNTS":
      return { ...state, unreadCounts: payload };

    case "LOGOUT":
      return { ...initialState };

    default:
      return state;
  }
};

const store = createStore(changeState);

export default store;