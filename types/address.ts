export type UserAddress = {
  id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  landmark: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserAddressesResponse = {
  data: UserAddress[];
};
