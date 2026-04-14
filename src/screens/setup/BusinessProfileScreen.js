import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Picker } from '@react-native-picker/picker';
import { updateAgentProfile, getAgent } from '../../database/database';
import { logOut } from '../../services/authService';
import { CURRENCIES } from '../../constants/currencies';

function getInitials(businessName) {
  if (!businessName?.trim()) return '??';
  const words = businessName.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function BusinessProfileScreen({ navigation, route }) {
  // If navigated from SettingsScreen, we're in edit mode
  const isEditMode = route?.params?.edit === true || navigation.canGoBack();
  const [logoUri, setLogoUri] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [currency, setCurrency] = useState('AED');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [tagline, setTagline] = useState('');
  const [trn, setTrn] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Pre-fill if editing from Settings
  useEffect(() => {
    (async () => {
      try {
        const agent = await getAgent();
        if (!agent) return;
        if (agent.business_logo_uri) setLogoUri(agent.business_logo_uri);
        if (agent.business_name) setBusinessName(agent.business_name);
        if (agent.currency) setCurrency(agent.currency);
        if (agent.business_phone) setPhone(agent.business_phone);
        if (agent.business_email) setEmail(agent.business_email);
        if (agent.business_address) setAddress(agent.business_address);
        if (agent.business_tagline) setTagline(agent.business_tagline);
        if (agent.business_trn) setTrn(agent.business_trn);
      } catch {}
    })();
  }, []);

  async function pickLogo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setLogoUri(result.assets[0].uri);
    }
  }

  function validate() {
    const newErrors = {};
    if (!businessName.trim()) newErrors.businessName = 'Business name is required';
    if (!currency) newErrors.currency = 'Currency is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);

    try {
      let savedLogoUri = null;

      if (logoUri) {
        const logoDir = FileSystem.documentDirectory + 'logos/';
        const dirInfo = await FileSystem.getInfoAsync(logoDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(logoDir, { intermediates: true });
        }
        const filename = 'business_logo_' + Date.now() + '.jpg';
        const destPath = logoDir + filename;

        // Only copy if it's not already in our documents directory
        if (!logoUri.startsWith(FileSystem.documentDirectory)) {
          await FileSystem.copyAsync({ from: logoUri, to: destPath });
          savedLogoUri = destPath;
        } else {
          savedLogoUri = logoUri;
        }
      }

      await updateAgentProfile({
        business_name: businessName.trim(),
        business_logo_uri: savedLogoUri,
        business_phone: phone.trim() || null,
        business_email: email.trim() || null,
        business_address: address.trim() || null,
        business_tagline: tagline.trim() || null,
        business_trn: trn.trim() || null,
        currency,
      });

      if (isEditMode) {
        navigation.goBack();
      } else {
        navigation.replace('Main');
      }
    } catch (err) {
      setErrors({ general: 'Failed to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    try {
      await logOut();
    } catch {}
  }

  const initials = getInitials(businessName);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        {isEditMode && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'< Back'}</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{isEditMode ? 'Edit Business Profile' : 'Set Up Your Business'}</Text>
        <Text style={styles.subtitle}>This will appear on all tenant documents</Text>

        {/* Logo Picker */}
        <View style={styles.logoSection}>
          <TouchableOpacity onPress={pickLogo} activeOpacity={0.8}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoImage} />
            ) : (
              <View style={styles.initialsCircle}>
                <Text style={styles.initialsText}>{initials}</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>Edit</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Business Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Business Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.businessName && styles.inputError]}
            value={businessName}
            onChangeText={(v) => {
              setBusinessName(v);
              if (errors.businessName) setErrors((e) => ({ ...e, businessName: null }));
            }}
            placeholder="e.g. Al Noor Properties"
            placeholderTextColor="#AAAAAA"
            returnKeyType="next"
          />
          {errors.businessName ? (
            <Text style={styles.errorText}>{errors.businessName}</Text>
          ) : null}
        </View>

        {/* Currency */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Currency <Text style={styles.required}>*</Text>
          </Text>
          <View style={[styles.pickerWrapper, errors.currency && styles.inputError]}>
            <Picker
              selectedValue={currency}
              onValueChange={(v) => {
                setCurrency(v);
                if (errors.currency) setErrors((e) => ({ ...e, currency: null }));
              }}
              style={styles.picker}
              dropdownIconColor="#26215C"
            >
              {CURRENCIES.map((c) => (
                <Picker.Item key={c.code} label={`${c.code} — ${c.name}`} value={c.code} />
              ))}
            </Picker>
          </View>
          {errors.currency ? (
            <Text style={styles.errorText}>{errors.currency}</Text>
          ) : null}
        </View>

        {/* Business Phone */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Business Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+971 50 000 0000"
            placeholderTextColor="#AAAAAA"
            keyboardType="phone-pad"
            returnKeyType="next"
          />
        </View>

        {/* Business Email */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Business Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="info@yourcompany.com"
            placeholderTextColor="#AAAAAA"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
          />
        </View>

        {/* Business Address */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Business Address</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={address}
            onChangeText={setAddress}
            placeholder="Building, Street, City, Country"
            placeholderTextColor="#AAAAAA"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Tagline */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Tagline</Text>
          <TextInput
            style={styles.input}
            value={tagline}
            onChangeText={setTagline}
            placeholder="Your trusted landlord"
            placeholderTextColor="#AAAAAA"
            returnKeyType="next"
          />
        </View>

        {/* TRN */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>TRN / Trade Registration No</Text>
          <TextInput
            style={styles.input}
            value={trn}
            onChangeText={setTrn}
            placeholder="e.g. 100123456700003"
            placeholderTextColor="#AAAAAA"
            autoCapitalize="characters"
            returnKeyType="done"
          />
        </View>

        {errors.general ? (
          <Text style={[styles.errorText, styles.generalError]}>{errors.general}</Text>
        ) : null}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>{isEditMode ? 'Save Changes' : 'Save & Continue'}</Text>
          )}
        </TouchableOpacity>

        {!isEditMode && (
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Reset &amp; Start Over</Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 15,
    color: '#26215C',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: '#888780',
    marginBottom: 32,
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EEEDFE',
  },
  initialsCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#7F77DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#26215C',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  editBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  // Form fields
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  required: {
    color: '#E24B4A',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#1A1A2E',
    backgroundColor: '#F8F8F8',
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: 11,
  },
  inputError: {
    borderColor: '#E24B4A',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
    overflow: 'hidden',
  },
  picker: {
    color: '#1A1A2E',
    height: 50,
  },
  errorText: {
    color: '#E24B4A',
    fontSize: 12,
    marginTop: 4,
  },
  generalError: {
    textAlign: 'center',
    marginBottom: 12,
  },

  // Save button
  saveButton: {
    backgroundColor: '#26215C',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  resetButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  resetButtonText: {
    color: '#E24B4A',
    fontSize: 14,
  },
  bottomPadding: {
    height: 40,
  },
});
