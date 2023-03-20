import '@/styles/globals.css'
import { store } from "../app/store";
import { Provider } from "react-redux";


import { SessionProvider as AuthProvider } from "next-auth/react" 

export default function App({ Component, pageProps }) {
  return <AuthProvider session={pageProps.session}>
            <Provider store={store}>
              <Component {...pageProps} />
            </Provider>
          </AuthProvider> 
}
