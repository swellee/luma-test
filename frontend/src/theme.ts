
import type { ThemeConfig as AntdThemeConfig } from "antd";

export interface ThemeColors {
  // 主色调
  primary: string;
  primaryHover: string;
  primaryActive: string;
  defaultBtnBg: string;
  defaultBtnHover: string;

  // 文字色
  title: string;
  text: string;
  textSecondary: string;
  textLight: string;

  // 边框色
  border: string;

  // 特殊颜色
  accent: string;
  success: string;
  warning: string;
  error: string;

  // 组件特定颜色
  drawerBg: string;
  shadowColor: string;
  cardBg: string;
  menuBg: string;
  menuHoverBg: string;
  menuActiveBg: string;
  cardBgFrom: string;
  cardBgTo: string;
  cardImgMaskFrom: string;
  cardImgMaskTo: string;
  bodyBgFrom: string;
  bodyBgMid: string;
  bodyBgTo: string;
  headerBgFrom: string;
  headerBgMid: string;
  headerBgTo: string;
  modalBg: string;
  inputBg: string;
  labelColor: string;
  containerBgFrom: string;
  containerBgMid: string;
  containerBgTo: string;
};
const configTheme = (colors: ThemeColors): AntdThemeConfig => {
  return {
    token: {
      colorPrimary: colors.primary,
      colorPrimaryHover: colors.primaryHover,
      colorPrimaryActive: colors.primaryActive,
      colorBgBase: colors.bodyBgMid,
      colorTextBase: colors.text,
      colorTextSecondary: colors.textSecondary,
      colorBorder: colors.border,
      colorBgContainer: colors.containerBgFrom,
      colorBgElevated: colors.containerBgTo,
      borderRadius: 8,
    },
    components: {
      Form: {
        labelColor: colors.labelColor,
      },
      Button: {
        defaultBg: colors.defaultBtnBg,
        defaultColor: colors.text,
        defaultHoverColor: colors.title,
        defaultHoverBg: colors.defaultBtnHover,
        colorPrimary: colors.primary,
        colorPrimaryHover: colors.primaryHover,
        colorPrimaryActive: colors.primaryActive,
        colorText: "#f1f1f1ff",
        colorTextLightSolid: "#f6f6f6ff",
      },
      Tag: {
        defaultBg: colors.bodyBgMid,
        defaultColor: colors.text,
      },
      Input: {
        colorBgContainer: colors.inputBg,
        colorBorder: colors.border,
        colorText: colors.title,
        colorTextPlaceholder: colors.textSecondary,
        colorPrimary: colors.primary,
      },
      InputNumber: {
        colorBgContainer: colors.inputBg,
        colorBorder: colors.border,
        colorText: colors.title,
        colorTextPlaceholder: colors.textSecondary,
        colorPrimary: colors.primary,
      },
      Select: {
        colorBgElevated: colors.inputBg,
        colorBgContainer: colors.inputBg,
        colorBorder: colors.border,
        colorText: colors.title,
        colorTextPlaceholder: colors.textSecondary,
        colorPrimary: colors.primary,
        optionSelectedBg: colors.headerBgFrom,
        optionActiveBg: colors.headerBgFrom,
        optionSelectedColor: colors.textLight,
      },
      Card: {
        colorBgContainer: colors.cardBg,
        colorBorder: colors.border,
        colorText: colors.textLight,
      },
      Layout: {
        headerBg: colors.headerBgFrom,
        bodyBg: colors.bodyBgMid,
      },
      Menu: {
        itemBg: colors.menuBg,
        itemHoverBg: colors.menuHoverBg,
        itemSelectedBg: colors.menuActiveBg,
        itemColor: "#efefef",
        itemHoverColor: "#ffffff",
        colorBorder: "transparent",
        itemSelectedColor: colors.primary,
      },
      Tooltip: {
        colorBgSpotlight: colors.containerBgTo,
        colorTextLightSolid: colors.text,
      },
      Typography: {
        colorText: colors.text,
        colorTextLightSolid: colors.title,
      },
      Modal: {
        contentBg: colors.modalBg,
        headerBg: "transparent",
        footerBg: "transparent",
        titleFontSize: 20,
        titleLineHeight: 2,
      },
      Message: {
        contentBg: colors.headerBgMid,
        colorBorder: colors.border,
      },
      Table: {
        colorBgContainer: colors.containerBgTo,
        rowHoverBg: colors.containerBgTo,
        rowSelectedBg: colors.containerBgTo,
        headerBg: colors.containerBgMid,
        footerBg: colors.containerBgMid,

        rowExpandedBg: colors.containerBgTo,
        colorText: colors.text,
        colorTextLightSolid: colors.title,
      },
      Drawer: {
        colorBgElevated: colors.drawerBg,
      },
      Divider: {
        colorSplit: colors.border,
      },
    },
  };
};

export const colors: ThemeColors = {
  // 主色调
  primary: "#0ea5e9",
  primaryHover: "#38bdf8",
  primaryActive: "#38bdf8",
  defaultBtnBg: "#eafaffff",
  defaultBtnHover: "#c1ecffff",
  // 文字色
  title: "#005295ff",
  text: "#0369a1",
  textSecondary: "#94a3b8",
  textLight: "#f8fafc",
  labelColor: "#0ea5e9",

  // 边框色
  border: "#7bd1ffff",

  // 特殊颜色
  accent: "#38bdf8",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",

  // 组件特定颜色
  drawerBg: "#142f3bcb",
  shadowColor: "#7dd3fc",
  cardBg: "#f0f9ff",
  cardBgFrom: "#f0f9ff",
  cardBgTo: "#ffffff",
  cardImgMaskFrom: "#38bff853",
  cardImgMaskTo: "#38bff811",
  menuBg: "transparent",
  menuHoverBg: "oklch(90.1% 0.058 230.902)",
  menuActiveBg: "oklch(90.1% 0.058 230.902)",
  bodyBgFrom: "#e0f2fe",
  // bodyBgMid: "#e4f3fbff",
  bodyBgMid: "#bae6fd",
  bodyBgTo: "#dbeafe",
  inputBg: "#ffffffff",
  modalBg: "#bae6fd",
  headerBgFrom: "#7dd3fc",
  headerBgMid: "#38bdf8",
  headerBgTo: "#a5b4fc",
  containerBgFrom: "#f0f9ff",
  containerBgMid: "#bae6fdff",
  containerBgTo: "#d9f2ffff",
};

export const defaultTheme = configTheme(colors);