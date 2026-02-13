import type { Page } from '@playwright/test';
import {
  HomePage,
  ProductPage,
  CartPage,
  CheckoutPage,
  ChatWidgetPage,
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  ChaosPage,
  ProfilePage,
  ClaimsPage,
  InboxPage,
  NotificationsPage,
  AdminDashboardPage,
  AdminClaimsPage,
  AdminCouponsPage,
  AdminInventoryPage,
  AdminOrdersPage
} from '@pages';

export type UiTestFixtures = {
  homePage: HomePage;
  productPage: ProductPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  chatWidgetPage: ChatWidgetPage;
  chaosPage: ChaosPage;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  forgotPasswordPage: ForgotPasswordPage;
  resetPasswordPage: ResetPasswordPage;
  profilePage: ProfilePage;
  claimsPage: ClaimsPage;
  inboxPage: InboxPage;
  notificationsPage: NotificationsPage;
  adminDashboardPage: AdminDashboardPage;
  adminClaimsPage: AdminClaimsPage;
  adminCouponsPage: AdminCouponsPage;
  adminInventoryPage: AdminInventoryPage;
  adminOrdersPage: AdminOrdersPage;
};

type PageArgs = { page: Page };
type UseFixture<T> = (fixture: T) => Promise<void>;

const usePageObject =
  <T>(Ctor: new (page: Page) => T) =>
  async ({ page }: PageArgs, use: UseFixture<T>) => {
    await use(new Ctor(page));
  };

export const uiTestFixtures = {
  homePage: usePageObject(HomePage),
  productPage: usePageObject(ProductPage),
  cartPage: usePageObject(CartPage),
  checkoutPage: usePageObject(CheckoutPage),
  chatWidgetPage: usePageObject(ChatWidgetPage),
  chaosPage: usePageObject(ChaosPage),
  loginPage: usePageObject(LoginPage),
  registerPage: usePageObject(RegisterPage),
  forgotPasswordPage: usePageObject(ForgotPasswordPage),
  resetPasswordPage: usePageObject(ResetPasswordPage),
  profilePage: usePageObject(ProfilePage),
  claimsPage: usePageObject(ClaimsPage),
  inboxPage: usePageObject(InboxPage),
  notificationsPage: usePageObject(NotificationsPage),
  adminDashboardPage: usePageObject(AdminDashboardPage),
  adminClaimsPage: usePageObject(AdminClaimsPage),
  adminCouponsPage: usePageObject(AdminCouponsPage),
  adminInventoryPage: usePageObject(AdminInventoryPage),
  adminOrdersPage: usePageObject(AdminOrdersPage)
};
