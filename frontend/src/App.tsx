import { ConfigProvider } from "antd";
import { AppRouter } from "./routers";
import "antd/dist/antd.css";
import "./App.css";
import { defaultTheme } from "./theme";
function App() {
  return (
    <ConfigProvider theme={defaultTheme}>
      <AppRouter />
    </ConfigProvider>
  );
}

export default App;
