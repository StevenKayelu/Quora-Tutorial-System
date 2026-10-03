// import { useState, useEffect } from "react";
// import AuthContext from "../contexts/AuthContext";
// import { User } from "../../types/User";
// import Loader from "../../src/components/shared/Loader";

// const AuthProvider = ({ children }: { children: React.ReactNode }) => {
//   const [isAuth, setIsAuth] = useState<boolean>(false);
//   const [accessToken, setAccessToken] = useState<string>("");
//   const [user, setUser] = useState<User | null>(null);
//   const [isLoading, setIsLoading] = useState<boolean>(false);

//   useEffect(() => {
//     const storedUser = localStorage.getItem("user");
//     const storedToken = localStorage.getItem("accessToken");

//     if (storedUser && storedToken) {
//       setUser(JSON.parse(storedUser));
//       setAccessToken(storedToken);
//       setIsAuth(true);
//     }
//   }, []);

//   return (
//     <AuthContext.Provider
//       value={{
//         isAuth,
//         accessToken,
//         user,
//         isLoading,
//         setIsAuth,
//         setAccessToken,
//         setUser,
//         setIsLoading,
//       }}
//     >
//       {isLoading ? <Loader /> : null}
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export default AuthProvider;