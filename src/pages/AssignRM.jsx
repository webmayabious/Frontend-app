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
import BottomNav from "../navigations/BottomNav";
import Header from "../Layout/Header";
import { useNavigation } from "@react-navigation/native";

const AssignRM = () => {
    const navigation = useNavigation();
    const [selected, setSelected] = useState([]);
    const data = [1, 2, 3, 4];

    const toggleSelect = (index) => {
        setSelected(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const toggleSelectAll = () => {
        if (selected.length === data.length) {
            setSelected([]);
        } else {
            setSelected(data.map((_, i) => i));
        }
    };

    const isAllSelected = selected.length === data.length;

    return (
        <SafeAreaView style={styles.container}>

            <Header />

            <View style={styles.topBarContainer}>
                <View style={styles.topBar}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>Assign RM</Text>
                        <View style={styles.badge}>
                            <Text style={styles.total}>4492 Records</Text>
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
                <TouchableOpacity style={styles.btn}>
                    <Text style={styles.btnText} numberOfLines={1} adjustsFontSizeToFit>
                        Assign RM
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btn}>
                    <Text style={styles.btnText} numberOfLines={1} adjustsFontSizeToFit>
                        Add New Lead
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btn}>
                    <Text style={styles.btnText} numberOfLines={1} adjustsFontSizeToFit>
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

            {/* SELECT ALL + FILTER ROW */}
            <View style={styles.selectAllRow}>
                <TouchableOpacity
                    style={styles.selectAllLeft}
                    onPress={toggleSelectAll}
                >
                    <View style={[styles.checkbox, isAllSelected && styles.checkboxChecked]}>
                        {isAllSelected && <Icon name="check" size={12} color="#fff" />}
                    </View>
                    <Text style={styles.selectAllText}>
                        {isAllSelected ? 'Deselect All' : 'Select All'}
                    </Text>
                    {selected.length > 0 && (
                        <View style={styles.selectedBadge}>
                            <Text style={styles.selectedBadgeText}>
                                {selected.length} selected
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.filterBtn}>
                    <Icon name="filter-list" size={14} color="#fff" />
                    <Text style={styles.filterText}>By Details</Text>
                    <Icon name="keyboard-arrow-down" size={14} color="#fff" />
                </TouchableOpacity>
            </View>
                {data.map((item, index) => {
                    const isChecked = selected.includes(index);
                    return (
                        <View key={index} style={[styles.card, isChecked && styles.cardSelected]}>

                            <View style={styles.cardTop}>
                                <View style={styles.nameRow}>
                                    <TouchableOpacity
                                        onPress={() => toggleSelect(index)}
                                        style={[styles.checkbox, isChecked && styles.checkboxChecked]}
                                    >
                                        {isChecked && (
                                            <Icon name="check" size={12} color="#fff" />
                                        )}
                                    </TouchableOpacity>
                                    <View style={styles.nameIndicator} />
                                    <Text style={styles.name}>BAYABI PAUL</Text>
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
                                    <Text style={styles.text}>1234567890</Text>
                                </View>
                                <View style={styles.contactItem}>
                                    <Icon name="email" size={13} color="#00cfff" />
                                    <Text style={styles.text} numberOfLines={1}>
                                        bayabipaul@gmail.com
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.row}>
                                <Icon name="location-on" size={13} color="#00cfff" />
                                <Text style={styles.text}>Kolkata</Text>
                            </View>

                            <View style={styles.refRow}>
                                <Text style={styles.refLabel}>Reference: </Text>
                                <Text style={styles.refValue}>Akhil</Text>
                            </View>

                        </View>
                    );
                })}
            </ScrollView>

            <BottomNav />
        </SafeAreaView>
    );
};

export default AssignRM;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0b0f4a",
    },
    topBarContainer: {
        paddingHorizontal: 15,
        marginTop: 10,
        marginBottom: 6,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff15',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        flexShrink: 1,
    },
    title: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    badge: {
        backgroundColor: '#f4c54220',
        borderWidth: 1,
        borderColor: '#f4c54255',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    total: {
        color: '#f4c542',
        fontSize: 11,
        fontWeight: '500',
    },
    backBtn: {
        borderWidth: 1,
        borderColor: '#ffffff40',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
        backgroundColor: '#ffffff10',
        marginLeft: 8,
    },
    backText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        marginBottom: 10,
    },
    btn: {
        flex: 1,
        marginHorizontal: 4,
        backgroundColor: '#3a3f7a',
        paddingVertical: 8,
        paddingHorizontal: 6,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 36,
    },
    btnText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
    },
    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        paddingHorizontal: 0,
    },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#555",
        borderRadius: 20,
        paddingHorizontal: 10,
        flex: 1,
        height: 38,
    },
    input: {
        color: "#fff",
        marginLeft: 5,
        flex: 1,
        fontSize: 13,
    },
    selectAllRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
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
    filterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#3a3f7a',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ffffff20',
    },
    filterText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
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
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: "#ffffff60",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
    },
    checkboxChecked: {
        backgroundColor: "#00cfff",
        borderColor: "#00cfff",
    },
    nameIndicator: {
        width: 4,
        height: 16,
        backgroundColor: "#00cfff",
        borderRadius: 4,
    },
    name: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 13,
        letterSpacing: 0.5,
    },
    iconRow: {
        flexDirection: "row",
        gap: 12,
    },
    divider: {
        height: 1,
        backgroundColor: "#ffffff15",
        marginBottom: 8,
    },
    section: {
        color: "#f4c542",
        fontSize: 11,
        fontWeight: "600",
        marginBottom: 6,
    },
    contactRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
        gap: 8,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flex: 1,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginBottom: 5,
    },
    text: {
        color: "#ccc",
        fontSize: 11,
        flexShrink: 1,
    },
    refRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
    },
    refLabel: {
        color: "#f4c542",
        fontSize: 11,
        fontWeight: "600",
    },
    refValue: {
        color: "#fff",
        fontSize: 11,
    },
});