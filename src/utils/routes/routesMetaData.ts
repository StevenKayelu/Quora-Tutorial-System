export type Routes = {
  [key: string]: string;
};

const routes: Routes = {
  "/": "Home",
  "/login": "Login",
  "/register": "Register",
  "/admin": "Dashboard | Admin panel",
  "/user": "Dashboard | User panel",
};


export default routes;
