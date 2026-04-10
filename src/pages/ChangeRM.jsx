import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    TextInput,
    ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import BottomNav from "../navigations/BottomNav";
import Header from "../Layout/Header";
import { useNavigation } from "@react-navigation/native";

const data = [
    {
        id: 1,
        name: "ABCD2",
        status: "Active",
        phone: "1234567890",
        company: "MAYABIOUS ART LLP",
        email: "pqd@gmail.com",
        rm: "DIBAKAR DAS",
        location: "Delhi, NCR",
        reference: "Client Reference",
    },
    {
        id: 2,
        name: "Hrishita Ghosh",
        status: "Active",
        phone: "1234567890",
        company: "MAYABIOUS ART LLP",
        email: "pqd@gmail.com",
        rm: "Laltu Saha",
        location: "Delhi, NCR",
        reference: "Client Reference",
    },
    {
        id: 3,
        name: "ABCD2",
        status: "Active",
        phone: "1234567890",
        company: "MAYABIOUS ART LLP",
        email: "pqd@gmail.com",
        rm: "DIBAKAR DAS",
        location: "Delhi, NCR",
        reference: "Client Reference",
    },
    {
        id: 4,
        name: "ABCD2",
        status: "Active",
        phone: "1234567890",
        company: "MAYABIOUS ART LLP",
        email: "pqd@gmail.com",
        rm: "DIBAKAR DAS",
        location: "Delhi, NCR",
        reference: "Client Reference",
    },
    {
        id: 5,
        name: "ABCD2",
        status: "Active",
        phone: "1234567890",
        company: "MAYABIOUS ART LLP",
        email: "pqd@gmail.com",
        rm: "DIBAKAR DAS",
        location: "Delhi, NCR",
        reference: "Client Reference",
    },
];

const ChangeRM = () => {
    const navigation = useNavigation();
    const [selected, setSelected] = useState([]);

    const toggleSelect = (id) => {
        setSelected(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selected.length === data.length) {
            setSelected([]);
        } else {
            setSelected(data.map(d => d.id));
        }
    };

    const isAllSelected = selected.length === data.length;

    return (
        <SafeAreaView style={styles.container}>

            <Header />

            {/* TOP BAR */}
            <View style={styles.topBarContainer}>
                <View style={styles.topBar}>
                    <View style={styles.topBarLeft}>
                        <MaterialCommunityIcons name="account-switch" size={18} color="#00cfff" />
                        <Text style={styles.title}>Change RM</Text>
                    </View>
                    <View style={styles.topBarRight}>
                        <TouchableOpacity style={styles.changeBtn}>
                            <Text style={styles.changeBtnText}>Change</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => navigation.navigate('Dashboard')}
                        >
                            <Text style={styles.backText}>← Back</Text>
                        </TouchableOpacity>


                    </View>
                </View>
            </View>



            {/* LIST */}
            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}
            >
                {/* SEARCH + ENTRIES */}
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Icon name="search" size={16} color="#aaa" />
                        <TextInput
                            placeholder="Search..."
                            placeholderTextColor="#aaa"
                            style={styles.input}
                        />
                    </View>
                </View>

                {/* SELECT ALL + FILTER */}
                {/* SELECT ALL + BACK ROW */}
                <View style={styles.selectAllRow}>
                    <TouchableOpacity style={styles.selectAllLeft} onPress={toggleSelectAll}>
                        <View style={[styles.checkbox, isAllSelected && styles.checkboxChecked]}>
                            {isAllSelected && <Icon name="check" size={11} color="#fff" />}
                        </View>
                        <Text style={styles.selectAllText}>Select All</Text>
                    </TouchableOpacity>

                    {selected.length > 0 && (
                        <View style={styles.selectedBadge}>
                            <Text style={styles.selectedBadgeText}>{selected.length} selected</Text>
                        </View>
                    )}

                    <TouchableOpacity style={styles.filterBtn}>
                        <Icon name="filter-list" size={13} color="#fff" />
                        <Text style={styles.filterText}>By Details</Text>
                        <Icon name="keyboard-arrow-down" size={13} color="#fff" />
                    </TouchableOpacity>
                </View>
                {data.map((item) => {
                    const isChecked = selected.includes(item.id);
                    return (
                        <View key={item.id} style={[styles.card, isChecked && styles.cardSelected]}>

                            {/* CARD TOP */}
                            <View style={styles.cardTop}>
                                <View style={styles.nameRow}>
                                    <TouchableOpacity
                                        onPress={() => toggleSelect(item.id)}
                                        style={[styles.checkbox, isChecked && styles.checkboxChecked]}
                                    >
                                        {isChecked && <Icon name="check" size={11} color="#fff" />}
                                    </TouchableOpacity>
                                    <Text style={styles.name}>{item.name}</Text>
                                    <View style={styles.statusBadge}>
                                        <Text style={styles.statusText}>{item.status}</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.divider} />
                            {/* CARD BODY */}
                            <View style={styles.cardBody}>
                                {/* LEFT COLUMN */}
                                <View style={styles.leftCol}>
                                    <View style={styles.infoRow}>
                                        <Icon name="call" size={12} color="#00cfff" />
                                        <Text style={styles.infoText}>{item.phone}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <MaterialCommunityIcons name="file-document-outline" size={12} color="#00cfff" />
                                        <Text style={styles.infoText}>{item.company}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Icon name="email" size={12} color="#00cfff" />
                                        <Text style={styles.infoText}>{item.email}</Text>
                                    </View>
                                </View>

                                {/* RIGHT COLUMN */}
                                <View style={styles.rightCol}>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.rmLabel}>RM: </Text>
                                        <Text style={styles.rmValue}>{item.rm}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Icon name="location-on" size={12} color="#f4c542" />
                                        <Text style={styles.infoText}>{item.location}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.refLabel}>Reference: </Text>
                                        <Text style={styles.refValue}>{item.reference}</Text>
                                    </View>
                                </View>
                            </View>

                        </View>
                    );
                })}
            </ScrollView>

            <BottomNav />
        </SafeAreaView>
    );
};

export default ChangeRM;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0b0f4a",
    },
    topBarContainer: {
        paddingHorizontal: 12,
        marginTop: 10,
        marginBottom: 8,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff10',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
    },
    topBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    topBarRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    changeBtn: {
        borderWidth: 1,
        borderColor: '#ffffff40',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 5,
        backgroundColor: '#ffffff10',
    },
    changeBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#3a3f7a',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ffffff20',
    },
    filterText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '500',
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        paddingHorizontal: 0,
        gap: 8,
    },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#555",
        borderRadius: 20,
        paddingHorizontal: 10,
        height: 36,
        flex: 1,
    },
    input: {
        color: "#fff",
        marginLeft: 5,
        fontSize: 12,
        flex: 1,
    },
    entriesText: {
        color: "#aaa",
        fontSize: 10,
        flex: 1,
        flexWrap: 'wrap',
    },
    selectAllRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 13,
        marginBottom: 8,
    },
    selectAllLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    selectAllText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
    selectedBadge: {
        backgroundColor: '#00cfff22',
        borderWidth: 1,
        borderColor: '#00cfff55',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 2,
    },
    selectedBadgeText: {
        color: '#00cfff',
        fontSize: 11,
        fontWeight: '500',
    },
    checkbox: {
        width: 17,
        height: 17,
        borderRadius: 3,
        borderWidth: 1.5,
        borderColor: "#ffffff50",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
    },
    checkboxChecked: {
        backgroundColor: "#00cfff",
        borderColor: "#00cfff",
    },
    card: {
        backgroundColor: "#1e2260",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: .3,
        borderColor: "#FFFF",
    },
    cardSelected: {
        borderColor: "#00cfff55",
        backgroundColor: "#1a2a6a",
    },
    cardTop: {
        marginBottom: 8,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    name: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 13,
        letterSpacing: 0.3,
    },
    statusBadge: {
        backgroundColor: "#1db95433",
        borderWidth: 1,
        borderColor: "#1db95466",
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    statusText: {
        color: "#1db954",
        fontSize: 10,
        fontWeight: "600",
    },
    cardBody: {
        flexDirection: 'row',
        gap: 8,
    },
    leftCol: {
        flex: 1,
        gap: 5,
    },
    rightCol: {
        flex: 1,
        gap: 5,
    },
    infoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    infoText: {
        color: "#ccc",
        fontSize: 11,
        flexShrink: 1,
    },
    rmLabel: {
        color: "#f4c542",
        fontSize: 11,
        fontWeight: "600",
    },
    rmValue: {
        color: "#f4c542",
        fontSize: 11,
        fontWeight: "600",
        flexShrink: 1,
    },
    refLabel: {
        color: "#f4c542",
        fontSize: 10,
        fontWeight: "600",
    },
    refValue: {
        color: "#f4c542",
        fontSize: 10,
        flexShrink: 1,
    },
    backBtn: {
        borderWidth: 1,
        borderColor: '#ffffff40',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 5,
        backgroundColor: '#ffffff10',
    },
    backText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: "#ffffff15",
        marginBottom: 8,
    },
});