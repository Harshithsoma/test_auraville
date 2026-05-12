"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError, commerceApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import type { UserAddress, UserAddressesResponse } from "@/types/address";

type AddressFormState = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  landmark: string;
  isDefault: boolean;
};

type AddressMutationResponse = {
  data: UserAddress;
};

type AddressDeleteResponse = {
  data: {
    id: string;
    deleted: true;
  };
};

const defaultForm: AddressFormState = {
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  landmark: "",
  isDefault: false
};

function toForm(address: UserAddress): AddressFormState {
  return {
    fullName: address.fullName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? "",
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: address.country,
    landmark: address.landmark ?? "",
    isDefault: address.isDefault
  };
}

function validateForm(form: AddressFormState): string | null {
  if (form.fullName.trim().length < 2) return "Full name is required.";
  if (!/^\+?[0-9]{10,15}$/.test(form.phone.trim())) return "Enter a valid phone number.";
  if (form.addressLine1.trim().length < 3) return "Address line 1 is required.";
  if (form.city.trim().length < 2) return "City is required.";
  if (form.state.trim().length < 2) return "State is required.";
  if (form.pincode.trim().length < 4) return "Pincode is required.";
  if (form.country.trim().length < 2) return "Country is required.";
  return null;
}

export function SavedAddressesClient() {
  const hasMounted = useHasMounted();
  const user = useAuthStore((state) => state.user);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyAddressId, setBusyAddressId] = useState<string | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormState>(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadAddresses() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await commerceApi.account.addresses.list<UserAddressesResponse>();
      setAddresses(response.data);
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        setError(loadError.message);
      } else {
        setError("Unable to load saved addresses.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!hasMounted || isHydrating || !user) return;
    void loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMounted, isHydrating, user?.id]);

  const formTitle = useMemo(
    () => (editingAddressId ? "Edit address" : "Add new address"),
    [editingAddressId]
  );

  function resetForm() {
    setEditingAddressId(null);
    setForm(defaultForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      if (editingAddressId) {
        const response = await commerceApi.account.addresses.update<
          AddressMutationResponse,
          AddressFormState
        >(editingAddressId, form);
        setAddresses((current) =>
          current.map((address) => (address.id === response.data.id ? response.data : address))
        );
        setMessage("Address updated.");
      } else {
        const response = await commerceApi.account.addresses.create<
          AddressMutationResponse,
          AddressFormState
        >(form);
        setAddresses((current) => [response.data, ...current]);
        setMessage("Address added.");
      }
      await loadAddresses();
      resetForm();
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError("Unable to save address.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(addressId: string) {
    if (!window.confirm("Delete this saved address?")) return;
    setBusyAddressId(addressId);
    setError(null);
    setMessage(null);
    try {
      await commerceApi.account.addresses.remove<AddressDeleteResponse>(addressId);
      setAddresses((current) => current.filter((address) => address.id !== addressId));
      if (editingAddressId === addressId) {
        resetForm();
      }
      setMessage("Address deleted.");
      await loadAddresses();
    } catch (deleteError) {
      if (deleteError instanceof ApiError) {
        setError(deleteError.message);
      } else {
        setError("Unable to delete address.");
      }
    } finally {
      setBusyAddressId(null);
    }
  }

  async function handleSetDefault(addressId: string) {
    setBusyAddressId(addressId);
    setError(null);
    setMessage(null);
    try {
      const response = await commerceApi.account.addresses.setDefault<AddressMutationResponse>(addressId);
      setAddresses((current) =>
        current.map((address) => ({
          ...address,
          isDefault: address.id === response.data.id
        }))
      );
      setMessage("Default address updated.");
      await loadAddresses();
    } catch (setDefaultError) {
      if (setDefaultError instanceof ApiError) {
        setError(setDefaultError.message);
      } else {
        setError("Unable to set default address.");
      }
    } finally {
      setBusyAddressId(null);
    }
  }

  if (!hasMounted || isHydrating || !hasHydrated) {
    return <div className="rounded-lg border border-[var(--line)] bg-white p-8">Loading addresses...</div>;
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-2xl rounded-lg border border-[var(--line)] bg-white p-8 text-center">
        <h1 className="text-3xl font-semibold">Login to manage saved addresses.</h1>
        <p className="mt-3 text-[var(--muted)]">Your addresses are securely tied to your account.</p>
        <Button className="mt-6" href="/auth?redirect=/account/addresses">
          Login
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-lg border border-[var(--line)] bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase text-[var(--coral)]">Account</p>
            <h1 className="mt-2 text-3xl font-semibold">Saved Addresses</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Save delivery addresses for faster checkout.
            </p>
          </div>
          <Button type="button" variant="secondary" href="/account">
            Back to profile
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-[#e7c9c6] bg-[#fff7f7] px-3 py-2 text-sm font-semibold text-[var(--coral)]">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-[var(--line)] bg-[var(--mint)] px-3 py-2 text-sm font-semibold text-[var(--leaf-deep)]">
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-lg border border-[var(--line)] bg-white p-6">
          <h2 className="text-xl font-semibold">Your saved addresses</h2>
          {isLoading ? (
            <p className="mt-4 text-sm text-[var(--muted)]">Loading addresses...</p>
          ) : addresses.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">No saved addresses yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {addresses.map((address) => (
                <li className="rounded-lg border border-[var(--line)] bg-[var(--background)] p-4" key={address.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        {address.fullName}{" "}
                        {address.isDefault ? (
                          <span className="ml-2 rounded bg-[var(--mint)] px-2 py-0.5 text-xs font-semibold text-[var(--leaf-deep)]">
                            Default
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{address.phone}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!address.isDefault ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-9 px-3 py-2 text-xs"
                          disabled={busyAddressId === address.id}
                          onClick={() => void handleSetDefault(address.id)}
                        >
                          Set default
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-9 px-3 py-2 text-xs"
                        disabled={busyAddressId === address.id}
                        onClick={() => {
                          setEditingAddressId(address.id);
                          setForm(toForm(address));
                          setMessage(null);
                          setError(null);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        className="min-h-9 px-3 py-2 text-xs"
                        disabled={busyAddressId === address.id}
                        onClick={() => void handleDelete(address.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    {address.addressLine1}
                    {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                    {address.landmark ? `, ${address.landmark}` : ""}
                    <br />
                    {address.city}, {address.state} {address.pincode}, {address.country}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form className="rounded-lg border border-[var(--line)] bg-white p-6" onSubmit={handleSubmit}>
          <h2 className="text-xl font-semibold">{formTitle}</h2>
          <div className="mt-4 space-y-3">
            <Input
              placeholder="Full name"
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            />
            <Input
              placeholder="Phone"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
            <Textarea
              className="min-h-20"
              placeholder="Address line 1"
              value={form.addressLine1}
              onChange={(event) => setForm((current) => ({ ...current, addressLine1: event.target.value }))}
            />
            <Input
              placeholder="Address line 2 (optional)"
              value={form.addressLine2}
              onChange={(event) => setForm((current) => ({ ...current, addressLine2: event.target.value }))}
            />
            <Input
              placeholder="Landmark (optional)"
              value={form.landmark}
              onChange={(event) => setForm((current) => ({ ...current, landmark: event.target.value }))}
            />
            <Input
              placeholder="City"
              value={form.city}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
            />
            <Input
              placeholder="State"
              value={form.state}
              onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
            />
            <Input
              placeholder="Pincode"
              value={form.pincode}
              onChange={(event) => setForm((current) => ({ ...current, pincode: event.target.value }))}
            />
            <Input
              placeholder="Country"
              value={form.country}
              onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))}
            />
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                checked={form.isDefault}
                type="checkbox"
                onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))}
              />
              Set as default address
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : editingAddressId ? "Update address" : "Save address"}
            </Button>
            {editingAddressId ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  resetForm();
                  setError(null);
                  setMessage(null);
                }}
              >
                Cancel edit
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}
