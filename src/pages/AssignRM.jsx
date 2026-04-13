import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import BottomNav from "../navigations/BottomNav";
import Header from "../Layout/Header";
import { useNavigation } from "@react-navigation/native";
import api from "../api/AxiosInstance";

const AssignRM = () => {
    const navigation = useNavigation();
    const [selected, setSelected] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedRM, setSelectedRM] = useState(null);
    const [rmList, setRmList] = useState([]);
    const [rmLoading, setRmLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);

    const [leads, setLeads] = useState([
        { id: 1234567963, name: "BAYABI PAUL", phone: "1234567890", email: "bayabipaul@gmail.com", location: "Kolkata", reference: "Akhil" },
        { id: 1234567964, name: "RAHUL DAS", phone: "9876543210", email: "rahuldas@gmail.com", location: "Mumbai", reference: "Sunil" },
        { id: 1234567965, name: "PRIYA ROY", phone: "8765432109", email: "priyaroy@gmail.com", location: "Delhi", reference: "Arun" },
        { id: 1234567966, name: "AMIT SHARMA", phone: "7654321098", email: "amitsharma@gmail.com", location: "Pune", reference: "Vikram" },
    ]);

    useEffect(() => {
        fetchRMList();
    }, []);

    const fetchRMList = async () => {
        setRmLoading(true);
        try {

            const res = await api.get("/api/pm/getRMList");
            if (res?.data?.status) {
                setRmList(res.data.data || []);
            }
        } catch (error) {
            console.log("RM fetch error:", error);
        } finally {
            setRmLoading(false);
        }
    };

    // ✅ Selected leads এর actual ID array
    const selectedLeadIds = selected.map(index => leads[index]?.id);

    const handleAssignRM = async () => {
        if (!selectedRM) {
            alert("Please select an RM");
            return;
        }
        if (selectedLeadIds.length === 0) {
            alert("No leads selected");
            return;
        }
        setAssigning(true);
        try {
            // ✅ Exact payload: { rm_id: 1110, property_lead_id: [1234567963] }
            const payload = {
                rm_id: selectedRM,
                property_lead_id: selectedLeadIds,
            };
            console.log("Assign payload:", payload);

            const res = await api.post("/api/pm/assignRM", payload);

            if (res?.data?.status) {
                alert(res?.data?.message || "RM Assigned Successfully!");
                setShowModal(false);
                setSelected([]);
                setSelectedRM(null);
            } else {
                alert(res?.data?.message || "Failed to assign RM");
            }
        } catch (error) {
            console.log("Assign RM error:", error);
            alert("Something went wrong");
        } finally {
            setAssigning(false);
        }
    };

    const toggleSelect = (index) => {
        setSelected(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const toggleSelectAll = () => {
        if (selected.length === leads.length) {
            setSelected([]);
        } else {
            setSelected(leads.map((_, i) => i));
        }
    };

    const isAllSelected = selected.length === leads.length && leads.length > 0;

    return (
        <SafeAreaView style={styles.container}>
            <Header />

            <View style={styles.topBarContainer}>
                <View style={styles.topBar}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>Assign RM</Text>
                        <View style={styles.badge}>
                            <Text style={styles.total}>{leads.length} Records</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Dashboard')}
                        style={styles.backBtn}
                    >
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={styles.btn}
                    onPress={() => {
                        if (selected.length === 0) {
                            alert("Please select at least one lead");
                            return;
                        }
                        setShowModal(true);
                    }}
                >
                    <Text style={styles.btnText}>Assign RM</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btn}>
                    <Text style={styles.btnText} numberOfLines={1} adjustsFontSizeToFit>Add New Lead</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.btn}
                    onPress={() => setShowUploadModal(true)}
                >
                    <Text
                        style={styles.btnText}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        Upload Lead Info List
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Icon name="search" size={18} color="#aaa" />
                        <TextInput
                            placeholder="Search..."
                            placeholderTextColor="#aaa"
                            style={styles.input}
                        />
                    </View>
                </View>

                <View style={styles.selectAllRow}>
                    <TouchableOpacity style={styles.selectAllLeft} onPress={toggleSelectAll}>
                        <View style={[styles.checkbox, isAllSelected && styles.checkboxChecked]}>
                            {isAllSelected && <Icon name="check" size={12} color="#fff" />}
                        </View>
                        <Text style={styles.selectAllText}>
                            {isAllSelected ? 'Deselect All' : 'Select All'}
                        </Text>
                        {selected.length > 0 && (
                            <View style={styles.selectedBadge}>
                                <Text style={styles.selectedBadgeText}>{selected.length} selected</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.filterBtn}>
                        <Icon name="filter-list" size={14} color="#fff" />
                        <Text style={styles.filterText}>By Details</Text>
                        <Icon name="keyboard-arrow-down" size={14} color="#fff" />
                    </TouchableOpacity>
                </View>

                {leads.map((item, index) => {
                    const isChecked = selected.includes(index);
                    return (
                        <View key={item.id} style={[styles.card, isChecked && styles.cardSelected]}>
                            <View style={styles.cardTop}>
                                <View style={styles.nameRow}>
                                    <TouchableOpacity
                                        onPress={() => toggleSelect(index)}
                                        style={[styles.checkbox, isChecked && styles.checkboxChecked]}
                                    >
                                        {isChecked && <Icon name="check" size={12} color="#fff" />}
                                    </TouchableOpacity>
                                    <View style={styles.nameIndicator} />
                                    <Text style={styles.name}>{item.name}</Text>
                                </View>
                                <View style={styles.iconRow}>
                                    <Icon name="delete" size={16} color="#ff4444" />
                                    <Icon name="edit" size={16} color="#00cfff" />
                                </View>
                            </View>

                            <View style={styles.divider} />
                            <Text style={styles.section}>Contact Details:</Text>

                            <View style={styles.contactRow}>
                                <View style={styles.contactItem}>
                                    <Icon name="call" size={13} color="#00cfff" />
                                    <Text style={styles.text}>{item.phone}</Text>
                                </View>
                                <View style={styles.contactItem}>
                                    <Icon name="email" size={13} color="#00cfff" />
                                    <Text style={styles.text} numberOfLines={1}>{item.email}</Text>
                                </View>
                            </View>

                            <View style={styles.row}>
                                <Icon name="location-on" size={13} color="#00cfff" />
                                <Text style={styles.text}>{item.location}</Text>
                            </View>

                            <View style={styles.refRow}>
                                <Text style={styles.refLabel}>Reference: </Text>
                                <Text style={styles.refValue}>{item.reference}</Text>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>

            {/*  ASSIGN RM MODAL */}
            {showModal && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>

                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Assign RM</Text>
                            <TouchableOpacity onPress={() => { setShowModal(false); setSelectedRM(null); }}>
                                <Icon name="close" size={20} color="#aaa" />
                            </TouchableOpacity>
                        </View>

                        {/* Selected leads count info */}
                        <View style={styles.infoBox}>
                            <Icon name="people" size={14} color="#f4c542" />
                            <Text style={styles.infoText}>
                                {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? 's' : ''} selected
                            </Text>
                        </View>

                        <Text style={styles.label}>Select RM</Text>

                        {rmLoading ? (
                            <ActivityIndicator color="#00cfff" style={{ marginVertical: 20 }} />
                        ) : (
                            <ScrollView
                                style={styles.dropdownList}
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={true}
                            >
                                {rmList.length === 0 ? (
                                    <Text style={styles.noRMText}>No RM found</Text>
                                ) : (
                                    rmList.map((rm) => {
                                        const isSelected = selectedRM === rm.id;
                                        return (
                                            <TouchableOpacity
                                                key={rm.id}
                                                style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                                                onPress={() => setSelectedRM(rm.id)}
                                            >
                                                <View style={styles.rmItemLeft}>
                                                    <View style={[styles.rmRadio, isSelected && styles.rmRadioSelected]}>
                                                        {isSelected && <View style={styles.rmRadioInner} />}
                                                    </View>
                                                    <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>
                                                        {rm.name}
                                                    </Text>
                                                </View>
                                                {isSelected && <Icon name="check-circle" size={16} color="#00cfff" />}
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                            </ScrollView>
                        )}

                        {selectedRM && (
                            <View style={styles.selectedRMBadge}>
                                <Icon name="person-pin" size={14} color="#00cfff" />
                                <Text style={styles.selectedRMText}>
                                    {rmList.find(r => r.id === selectedRM)?.name}
                                </Text>
                            </View>
                        )}

                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => { setShowModal(false); setSelectedRM(null); }}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.assignBtn, (!selectedRM || assigning) && styles.assignBtnDisabled]}
                                onPress={handleAssignRM}
                                disabled={!selectedRM || assigning}
                            >
                                {assigning ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.assignBtnText}>Assign</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {showUploadModal && (
                <View style={styles.modalOverlay}>
                    <View style={styles.uploadModalContainer}>

                        {/* HEADER */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Upload Files</Text>
                            <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                                <Icon name="close" size={20} color="#aaa" />
                            </TouchableOpacity>
                        </View>

                        {/* FORM */}
                        <View style={styles.formBox}>

                            {/* Property */}
                            <Text style={styles.label}>Property Location</Text>
                            <View style={styles.inputBox}>
                                <Text style={styles.inputValue}>Delhi NCR</Text>
                                <Icon name="keyboard-arrow-down" size={18} color="#aaa" />
                            </View>

                            {/* Reference */}
                            <Text style={styles.label}>Reference</Text>
                            <View style={styles.inputBox}>
                                <Text style={styles.placeholder}>Select...</Text>
                                <Icon name="keyboard-arrow-down" size={18} color="#aaa" />
                            </View>

                            {/* Company */}
                            <Text style={styles.label}>Company</Text>
                            <View style={styles.inputBox}>
                                <Text style={styles.inputValue}>MADHYA DESIGN STUDIO</Text>
                                <Icon name="keyboard-arrow-down" size={18} color="#aaa" />
                            </View>

                            {/* Upload Row */}
                            <View style={styles.uploadRow}>
                                <TouchableOpacity style={styles.browseBtn}>
                                    <Icon name="folder-open" size={16} color="#fff" />
                                    <Text style={styles.browseText}>Browse file...</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.uploadBtn}>
                                    <Text style={styles.uploadBtnText}>Upload</Text>
                                </TouchableOpacity>
                            </View>

                        </View>

                        {/* DOWNLOAD BOX */}
                        <View style={styles.downloadCard}>
                            <Text style={styles.downloadTitle}>Download Format</Text>
                            <Text style={styles.downloadDesc}>
                                It is a long established fact that a reader will be distracted by readable content.
                            </Text>

                            <TouchableOpacity style={styles.downloadBtn}>
                                <Icon name="download" size={16} color="#000" />
                                <Text style={styles.downloadBtnText}>Download</Text>
                            </TouchableOpacity>
                        </View>

                        {/* FOOTER */}
                        <TouchableOpacity
                            style={styles.cancelBtnBottom}
                            onPress={() => setShowUploadModal(false)}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>

                    </View>
                </View>
            )}

            <BottomNav />
        </SafeAreaView>
    );
};

export default AssignRM;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0b0f4a" },
    topBarContainer: { paddingHorizontal: 15, marginTop: 10, marginBottom: 6 },
    topBar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#ffffff15', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, flexShrink: 1 },
    title: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
    badge: {
        backgroundColor: '#f4c54220', borderWidth: 1, borderColor: '#f4c54255',
        borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
    },
    total: { color: '#f4c542', fontSize: 11, fontWeight: '500' },
    backBtn: {
        borderWidth: 1, borderColor: '#ffffff40', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#ffffff10', marginLeft: 8,
    },
    backText: { color: '#fff', fontSize: 12, fontWeight: '500' },
    buttonRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingHorizontal: 15, marginBottom: 10,
    },
    btn: {
        flex: 1, marginHorizontal: 4, backgroundColor: '#3a3f7a',
        paddingVertical: 8, paddingHorizontal: 6, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center', minHeight: 36,
    },
    btnText: { color: '#fff', fontSize: 11, fontWeight: '500', textAlign: 'center' },
    searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    searchBox: {
        flexDirection: "row", alignItems: "center", borderWidth: 1,
        borderColor: "#555", borderRadius: 20, paddingHorizontal: 10, flex: 1, height: 38,
    },
    input: { color: "#fff", marginLeft: 5, flex: 1, fontSize: 13 },
    selectAllRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 14, marginBottom: 8,
    },
    selectAllLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    selectAllText: { color: '#fff', fontSize: 13, fontWeight: '500' },
    selectedBadge: {
        backgroundColor: '#00cfff22', borderWidth: 1, borderColor: '#00cfff55',
        borderRadius: 20, paddingHorizontal: 10, paddingVertical: 2,
    },
    selectedBadgeText: { color: '#00cfff', fontSize: 11, fontWeight: '500' },
    filterBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#3a3f7a',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
        borderWidth: 1, borderColor: '#ffffff20',
    },
    filterText: { color: '#fff', fontSize: 12, fontWeight: '500' },
    card: {
        backgroundColor: "#1e2260", borderRadius: 12, padding: 12,
        marginBottom: 10, borderWidth: 0.3, borderColor: "#FFFF",
    },
    cardSelected: { borderColor: "#00cfff55", backgroundColor: "#1a2a6a" },
    cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    checkbox: {
        width: 18, height: 18, borderRadius: 4, borderWidth: 1.5,
        borderColor: "#ffffff60", alignItems: "center", justifyContent: "center", backgroundColor: "transparent",
    },
    checkboxChecked: { backgroundColor: "#00cfff", borderColor: "#00cfff" },
    nameIndicator: { width: 4, height: 16, backgroundColor: "#00cfff", borderRadius: 4 },
    name: { color: "#fff", fontWeight: "700", fontSize: 13, letterSpacing: 0.5 },
    iconRow: { flexDirection: "row", gap: 12 },
    divider: { height: 1, backgroundColor: "#ffffff15", marginBottom: 8 },
    section: { color: "#f4c542", fontSize: 11, fontWeight: "600", marginBottom: 6 },
    contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, gap: 8 },
    contactItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
    row: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 5 },
    text: { color: "#ccc", fontSize: 11, flexShrink: 1 },
    refRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
    refLabel: { color: "#f4c542", fontSize: 11, fontWeight: "600" },
    refValue: { color: "#fff", fontSize: 11 },

    // MODAL
    modalOverlay: {
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)", justifyContent: "center", alignItems: "center",
    },
    modalContainer: {
        width: "88%", backgroundColor: "#1e2260", borderRadius: 14,
        padding: 18, maxHeight: "75%", borderWidth: 1, borderColor: "#ffffff15",
    },
    modalHeader: {
        flexDirection: "row", justifyContent: "space-between",
        alignItems: "center", marginBottom: 12,
    },
    modalTitle: { color: "#00cfff", fontSize: 16, fontWeight: "700" },
    infoBox: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: "#f4c54215", borderRadius: 8,
        paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12,
        borderWidth: 1, borderColor: "#f4c54230",
    },
    infoText: { color: "#f4c542", fontSize: 12, fontWeight: "500" },
    label: { color: "#fff", marginBottom: 8, fontSize: 13, fontWeight: "500" },
    dropdownList: {
        maxHeight: 200, borderWidth: 1, borderColor: "#ffffff20",
        borderRadius: 8, marginBottom: 12,
    },
    dropdownItem: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 12, paddingVertical: 11,
        borderBottomWidth: 0.5, borderBottomColor: "#ffffff10",
    },
    dropdownItemSelected: { backgroundColor: "#00cfff12" },
    rmItemLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    rmRadio: {
        width: 16, height: 16, borderRadius: 8, borderWidth: 1.5,
        borderColor: "#ffffff40", alignItems: "center", justifyContent: "center",
    },
    rmRadioSelected: { borderColor: "#00cfff" },
    rmRadioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#00cfff" },
    dropdownItemText: { color: "#bbb", fontSize: 13 },
    dropdownItemTextSelected: { color: "#00cfff", fontWeight: "600" },
    noRMText: { color: "#aaa", textAlign: "center", padding: 20, fontSize: 13 },
    selectedRMBadge: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: "#00cfff12", borderWidth: 1, borderColor: "#00cfff35",
        borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 14,
    },
    selectedRMText: { color: "#00cfff", fontSize: 12, fontWeight: "600" },
    modalBtnRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
    cancelBtn: {
        backgroundColor: "#ffffff15", paddingHorizontal: 18,
        paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: "#ffffff25",
    },
    cancelBtnText: { color: "#fff", fontWeight: "500", fontSize: 13 },
    assignBtn: {
        backgroundColor: "#00cfff", paddingHorizontal: 18,
        paddingVertical: 9, borderRadius: 20, minWidth: 80, alignItems: "center",
    },
    assignBtnDisabled: { backgroundColor: "#00cfff40" },
    assignBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
    modalOverlay: {
        position: "absolute",
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.75)",
        justifyContent: "center",
        alignItems: "center",
    },

    uploadModalContainer: {
        width: "88%",
        backgroundColor: "#0f172a",
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: "#ffffff20",
    },

    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },

    modalTitle: {
        color: "#38bdf8",
        fontSize: 16,
        fontWeight: "700",
    },

    formBox: {
        backgroundColor: "#020617",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },

    label: {
        color: "#9ca3af",
        fontSize: 11,
        marginBottom: 4,
        marginTop: 6,
    },

    inputBox: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#111827",
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 40,
        borderWidth: 1,
        borderColor: "#374151",
    },

    inputValue: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "500",
    },

    placeholder: {
        color: "#6b7280",
        fontSize: 13,
    },

    uploadRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 12,
    },

    browseBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#0284c7",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 25,
    },

    browseText: {
        color: "#fff",
        fontSize: 12,
    },

    uploadBtn: {
        backgroundColor: "#22c55e",
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 25,
    },

    uploadBtnText: {
        color: "#fff",
        fontWeight: "600",
    },

    downloadCard: {
        backgroundColor: "#020617",
        borderRadius: 12,
        padding: 12,
        marginTop: 6,
    },

    downloadTitle: {
        color: "#f59e0b",
        fontSize: 13,
        fontWeight: "600",
        marginBottom: 4,
    },

    downloadDesc: {
        color: "#9ca3af",
        fontSize: 11,
        marginBottom: 10,
    },

    downloadBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#fff",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: "flex-start",
    },

    downloadBtnText: {
        color: "#000",
        fontWeight: "500",
    },

    cancelBtnBottom: {
        marginTop: 14,
        alignSelf: "flex-end",
        backgroundColor: "#ef4444",
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 20,
    },

    cancelText: {
        color: "#fff",
        fontWeight: "500",
    },
});