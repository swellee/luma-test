import { ConfigProvider, theme } from "antd";
import { AppRouter } from "./routers";
import "antd/dist/antd.css";
import "./App.css";
import { defaultTheme } from "./theme";
function App() {
  return (
    <ConfigProvider theme={{
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: "#00B96B", // 主题色
        borderRadius: 6, // 边框圆角
      },
      
    }}>
      <AppRouter />
    </ConfigProvider>
  );
}

export default App;
