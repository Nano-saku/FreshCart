import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Shield, ChevronRight } from 'lucide-react-native';

interface Props {
    visible: boolean;
    onAccept: () => void;
    onDecline: () => void;
}

export function TermsModal({ visible, onAccept, onDecline }: Props) {
    const { theme } = useTheme();
    const [accepted, setAccepted] = useState(false);

    const handleAccept = () => {
        setAccepted(true);
        onAccept();
    };

    const styles = createStyles(theme);

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={[styles.modal, { backgroundColor: theme.surface }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={[styles.iconCircle, { backgroundColor: theme.primary + '15' }]}>
                            <Shield size={28} color={theme.primary} />
                        </View>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>Terms of Service</Text>
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                            Effective Date: June 22, 2026
                        </Text>
                        <View style={[styles.legalNotice, { backgroundColor: '#FF9800' + '15', borderColor: '#FF9800' + '40' }]}>
                            <Text style={[styles.legalNoticeText, { color: '#FF9800' }]}>
                                IMPORTANT: These Terms constitute a legally binding agreement. By accepting, you acknowledge that you have read and agreed to be bound.
                            </Text>
                        </View>
                    </View>

                    {/* Terms Content */}
                    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Welcome</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                Welcome to FreshCart. These Terms of Service ("Terms") govern your access to and use of
                                the FreshCart mobile application, website, services, and related systems (collectively,
                                the "Service"). By creating an account, accessing, or using FreshCart, you agree to comply
                                with and be legally bound by these Terms. If you do not agree with these Terms, you must not use the Service.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>1. Definitions</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                • "FreshCart", "we", "our", or "us" refers to the FreshCart platform and its operators.{'\n'}
                                • "User", "you", or "your" refers to any individual or entity accessing or using the Service.{'\n'}
                                • "Seller" refers to individuals or businesses listing products through the platform.{'\n'}
                                • "Buyer" refers to users purchasing products through the platform.{'\n'}
                                • "Content" refers to text, images, product listings, reviews, messages, and other materials uploaded or displayed through the Service.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>2. Eligibility and Legal Capacity</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                By using FreshCart, you represent and warrant that you are at least 18 years old or have
                                parental/guardian permission, are legally capable of entering into binding agreements,
                                and will comply with all applicable laws and regulations. We reserve the right to suspend
                                or terminate accounts that violate eligibility requirements.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>3. User Accounts</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                To access certain features, you may be required to create an account. You agree to provide
                                accurate and complete information, keep your login credentials secure, accept responsibility
                                for all activity under your account, and notify us immediately of unauthorized access or
                                security breaches. We may suspend or terminate accounts suspected of fraud, abuse, or violations of these Terms.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>4. Platform Services</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                FreshCart provides a digital marketplace where sellers may offer products and buyers may
                                browse and purchase products. FreshCart does not manufacture products unless explicitly
                                stated, does not guarantee product availability at all times, may facilitate payment
                                processing, order tracking, and communication between users, and reserves the right
                                to modify or discontinue features without prior notice.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>5. Seller Responsibilities</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                Sellers using FreshCart agree to provide accurate product descriptions, pricing, and
                                inventory information; ensure listed products comply with local laws and regulations;
                                fulfill orders honestly and within reasonable timeframes; avoid fraudulent, misleading,
                                or deceptive practices; and maintain respectful communication with buyers. FreshCart
                                reserves the right to remove listings or suspend seller accounts for policy violations.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>6. Buyer Responsibilities</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                Buyers agree to provide accurate delivery and payment information, make payments using
                                authorized methods, use the platform responsibly and lawfully, and avoid fraudulent
                                purchases, false claims, or abusive conduct. Buyers are responsible for reviewing
                                product details before placing orders.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>7. Payments & Transactions</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                Payments processed through FreshCart may involve third-party payment providers. By using
                                the Service, you acknowledge that prices are determined by sellers unless otherwise specified,
                                additional fees such as delivery charges or service fees may apply, transactions may be
                                delayed or canceled due to technical issues or fraud detection, and FreshCart reserves
                                the right to hold, limit, or cancel transactions suspected of fraudulent activity.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>8. Refunds and Cancellations</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                Refund and cancellation requests may depend on seller policies, product condition, delivery
                                status, and applicable consumer protection laws. FreshCart may assist in dispute resolution
                                but is not obligated to guarantee outcomes between buyers and sellers.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>9. Prohibited Conduct</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                Users must not violate laws or regulations, upload false or harmful content, attempt
                                unauthorized access, interfere with platform security, use bots or scraping tools, engage
                                in harassment or hate speech, distribute malware, or commit fraud or impersonation.
                                Violation may result in account suspension, termination, or legal action.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>10. Intellectual Property</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                All platform branding, logos, software, interface designs, and system components are owned
                                by FreshCart or its licensors. Users may not copy, modify, distribute, or reverse engineer
                                platform components or use FreshCart branding without written permission. Users retain
                                ownership of content they upload but grant FreshCart a non-exclusive, worldwide,
                                royalty-free license to use, display, and distribute such content.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>11. Privacy</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                Your use of the Service is also governed by our Privacy Policy. By using FreshCart, you
                                consent to the collection and processing of data necessary for account management, order
                                fulfillment, security and fraud prevention, platform improvement, and customer support.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>12. Availability & Technical Limitations</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                We strive to maintain reliable platform availability but do not guarantee uninterrupted
                                service. FreshCart is not liable for downtime, data loss, delayed transactions, technical
                                errors, or third-party system failures. Features may change, be removed, or updated at any time.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>13. Third-Party Services</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                FreshCart may integrate third-party services such as payment gateways, cloud storage
                                providers, analytics systems, authentication services, and delivery partners. We are
                                not responsible for the actions, policies, or availability of third-party services.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>14. Disclaimer of Warranties</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                To the maximum extent permitted by law, FreshCart and its operators shall not be liable
                                for indirect or consequential damages, lost profits or data, user disputes, product
                                defects from sellers, unauthorized account access, or service interruptions. THE SERVICE
                                IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND,
                                WHETHER EXPRESS OR IMPLIED. USE OF THE SERVICE IS ENTIRELY AT YOUR OWN RISK.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>15. Indemnification</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                You agree to defend, indemnify, and hold harmless FreshCart and its operators from claims,
                                damages, liabilities, and expenses arising from your use of the Service, your violation
                                of these Terms, your infringement of third-party rights, or fraudulent activities
                                conducted through your account.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>16. Termination</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                We reserve the right to suspend or terminate access to the Service at any time, with or
                                without notice, if users violate these Terms or engage in harmful conduct. Upon termination,
                                access to the platform may be revoked, certain data may be retained as required by law,
                                and outstanding obligations may remain enforceable.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>17. Governing Law & Disputes</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                These Terms shall be governed by and interpreted in accordance with the laws of the
                                Republic of the Philippines. Any disputes, claims, or controversies arising out of or
                                relating to these Terms or the Service shall be subject to the exclusive jurisdiction
                                of the proper courts located in the Republic of the Philippines. Users agree to attempt
                                good-faith resolution of disputes prior to initiating formal legal proceedings.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>18. Changes to These Terms</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                FreshCart reserves the right to update or modify these Terms at any time. Changes become
                                effective upon publication within the application or website. Continued use of the Service
                                after updates constitutes acceptance of the revised Terms.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>19. Contact Information</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                For questions, concerns, or legal inquiries:{'\n'}
                                • Email: support@freshcart.ph{'\n'}
                                • Phone: +63 900 000 0000{'\n'}
                                • Address: 123 Rizal Avenue, Makati City, Philippines
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>20. Electronic Acceptance</Text>
                            <Text style={[styles.text, { color: theme.textSecondary }]}>
                                By accessing, registering for, clicking "Accept," or otherwise using FreshCart, you
                                electronically consent to and agree to be legally bound by these Terms of Service.
                                Electronic acceptance shall have the same legal effect as a handwritten signature under
                                applicable electronic commerce and digital transaction laws. If any provision of these
                                Terms is found unenforceable, the remaining provisions shall remain in full force and
                                effect. These Terms constitute the complete and entire agreement between the user and
                                FreshCart regarding use of the Service.
                            </Text>
                        </View>

                        <View style={{ height: 20 }} />
                    </ScrollView>

                    {/* Buttons */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.declineBtn, { borderColor: theme.border }]}
                            onPress={onDecline}
                        >
                            <Text style={[styles.declineBtnText, { color: theme.textSecondary }]}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.acceptBtn, { backgroundColor: theme.primary }]}
                            onPress={handleAccept}
                        >
                            <Text style={styles.acceptBtnText}>Accept & Continue</Text>
                            <ChevronRight size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const createStyles = (theme: any) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        width: '100%',
        maxHeight: '85%',
        borderRadius: 24,
        overflow: 'hidden',
    },
    header: {
        alignItems: 'center',
        padding: 24,
        paddingBottom: 16,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        marginBottom: 12,
    },
    legalNotice: {
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        width: '100%',
    },
    legalNoticeText: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 16,
    },
    scrollView: {
        paddingHorizontal: 24,
        maxHeight: '60%',
    },
    section: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 6,
    },
    text: {
        fontSize: 13,
        lineHeight: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: 24,
        gap: 12,
    },
    declineBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1,
    },
    declineBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    acceptBtn: {
        flex: 2,
        padding: 14,
        borderRadius: 14,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    acceptBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});