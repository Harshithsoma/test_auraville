export type AuthUserResponse = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "USER" | "ADMIN";
};

export type VerifyOtpResponse = {
  data: {
    user: AuthUserResponse;
    accessToken: string;
  };
};

export type MeResponse = {
  data: {
    user: AuthUserResponse;
  };
};

export type AuthMessageResponse = {
  data: {
    message: string;
  };
};
