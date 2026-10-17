import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronDown, CircleAlert, MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Switch, View } from 'react-native';
import { z } from 'zod';

import { ApiError, errorMessage } from '@/api/client';
import { useGovernorates, useSaveAddress, type AddressInput } from '@/api/queries';
import type { Address } from '@/api/types';
import { useMe } from '@/auth/use-auth';
import { haptic } from '@/lib/haptics';
import { latinDigits, phoneField, requiredText } from '@/lib/validation';
import { useTheme } from '@/theme';
import { Banner, Button, Chip, Icon, Sheet, Tap, Text, TextField } from '@/ui';

const schema = z.object({
  label: z.string().trim().max(40).optional(),
  recipientName: requiredText('اكتب اسم المستلم'),
  phone: phoneField,
  governorate: requiredText('اختار المحافظة'),
  city: requiredText('اكتب المدينة أو المركز'),
  area: z.string().trim().optional(),
  street: requiredText('اكتب الشارع'),
  building: z.string().trim().optional(),
  floor: z.string().trim().optional(),
  apartment: z.string().trim().optional(),
  landmark: z.string().trim().optional(),
  isDefault: z.boolean(),
});
type Form = z.input<typeof schema>;

const LABELS = ['البيت', 'الشغل', 'عند الأهل'];

export function AddressForm({ address, onSaved, forceDefault }: { address?: Address; onSaved: (a: Address) => void; forceDefault?: boolean }) {
  const t = useTheme();
  const me = useMe();
  const govs = useGovernorates();
  const save = useSaveAddress();
  const [govOpen, setGovOpen] = useState(false);
  const { control, handleSubmit, formState, setValue, watch, setError } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: address?.label ?? 'البيت',
      recipientName: address?.recipientName ?? me.data?.name ?? '',
      phone: address?.phone?.replace(/^\+20/, '0') ?? me.data?.phone?.replace(/^\+20/, '0') ?? '',
      governorate: address?.governorate ?? '',
      city: address?.city ?? '',
      area: address?.area ?? '',
      street: address?.street ?? '',
      building: address?.building ?? '',
      floor: address?.floor ?? '',
      apartment: address?.apartment ?? '',
      landmark: address?.landmark ?? '',
      isDefault: forceDefault || (address?.isDefault ?? false),
    },
  });
  const gov = watch('governorate');
  const label = watch('label');
  const govName = govs.data?.find((g) => g.code === gov)?.ar;

  const submit = handleSubmit((v) => {
    const clean = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === 'string' ? x.trim() : x]).filter(([, x]) => x !== ''));
    save.mutate(
      { ...(clean as Partial<AddressInput>), phone: latinDigits(v.phone).replace(/[\s-]/g, ''), id: address?.id },
      {
        onSuccess: (a) => {
          haptic.success();
          onSaved(a);
        },
        onError: (e) => {
          haptic.error();
          if (e instanceof ApiError) for (const d of e.details) if (d.field && d.field in schema.shape) setError(d.field as keyof Form, { message: 'قيمة غير صحيحة' });
        },
      },
    );
  });

  const field = (name: keyof Form, labelText: string, opts: Partial<React.ComponentProps<typeof TextField>> = {}) => (
    <Controller
      control={control}
      name={name}
      render={({ field: f }) => (
        <TextField label={labelText} value={String(f.value ?? '')} onChangeText={f.onChange} onBlur={f.onBlur} error={formState.errors[name]?.message as string | undefined} {...opts} />
      )}
    />
  );

  return (
    <View style={styles.gap}>
      {save.error && <Banner icon={CircleAlert} tone="danger" title={errorMessage(save.error)} />}
      <View style={styles.gapSm}>
        <Text variant="ui" color="ink2">
          اسم العنوان
        </Text>
        <View style={styles.wrap}>
          {LABELS.map((l) => (
            <Chip key={l} label={l} selected={label === l} onPress={() => setValue('label', l)} />
          ))}
        </View>
      </View>
      {field('recipientName', 'اسم المستلم', { autoComplete: 'name', placeholder: 'مثال: محمد أحمد' })}
      {field('phone', 'موبايل المستلم', { keyboardType: 'phone-pad', ltr: true, placeholder: '01012345678', hint: 'المندوب هيتصل بالرقم ده' })}

      <View style={styles.gapSm}>
        <Text variant="ui" color="ink2">
          المحافظة
        </Text>
        <Tap
          onPress={() => setGovOpen(true)}
          pressScale={1}
          style={[styles.select, { borderColor: formState.errors.governorate ? t.c.danger : t.c.lineStrong, backgroundColor: t.c.surface, borderRadius: t.radius.md }]}
          accessibilityLabel={`المحافظة: ${govName ?? 'اختار'}`}
        >
          <Icon as={MapPin} size={20} color="ink3" />
          <Text variant="body" color={govName ? 'ink' : 'ink3'} style={styles.flex}>
            {govName ?? 'اختار المحافظة'}
          </Text>
          <Icon as={ChevronDown} size={20} color="ink3" />
        </Tap>
        {formState.errors.governorate && (
          <Text variant="meta" color="danger">
            {formState.errors.governorate.message}
          </Text>
        )}
      </View>
      <View style={styles.row}>
        <View style={styles.flex}>{field('city', 'المدينة / المركز', { placeholder: 'مثال: مدينة نصر' })}</View>
        <View style={styles.flex}>{field('area', 'المنطقة', { optional: true, placeholder: 'مثال: الحي السابع' })}</View>
      </View>
      {field('street', 'الشارع', { placeholder: 'مثال: 12 شارع التحرير' })}
      <View style={styles.row}>
        <View style={styles.flex}>{field('building', 'العمارة', { optional: true, placeholder: '12' })}</View>
        <View style={styles.flex}>{field('floor', 'الدور', { optional: true, keyboardType: 'number-pad', placeholder: '3' })}</View>
        <View style={styles.flex}>{field('apartment', 'الشقة', { optional: true, placeholder: '5' })}</View>
      </View>
      {field('landmark', 'علامة مميزة', { optional: true, placeholder: 'جنب صيدلية...' })}

      {!forceDefault && (
        <Controller
          control={control}
          name="isDefault"
          render={({ field: f }) => (
            <View style={styles.switchRow}>
              <Text variant="ui" style={styles.flex}>
                اجعله العنوان الافتراضي
              </Text>
              <Switch value={f.value} onValueChange={f.onChange} trackColor={{ true: t.c.accent, false: t.c.lineStrong }} thumbColor="#fff" accessibilityLabel="العنوان الافتراضي" />
            </View>
          )}
        />
      )}
      <Button label={address ? 'حفظ التعديلات' : 'حفظ العنوان'} loading={save.isPending} onPress={() => submit()} />

      <Sheet open={govOpen} onClose={() => setGovOpen(false)} title="اختار المحافظة">
        {(govs.data ?? []).map((g) => (
          <Tap
            key={g.code}
            pressScale={1}
            onPress={() => {
              setValue('governorate', g.code, { shouldValidate: true });
              setGovOpen(false);
            }}
            style={[styles.govRow, { borderColor: t.c.line }]}
            accessibilityState={{ selected: gov === g.code }}
          >
            <Text variant="body" style={styles.flex} weight={gov === g.code ? 'bold' : 'regular'}>
              {g.ar}
            </Text>
            {gov === g.code && <Icon as={Check} color="accent" />}
          </Tap>
        ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 14 },
  gapSm: { gap: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', gap: 10 },
  select: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 14, borderWidth: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  govRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth },
});
