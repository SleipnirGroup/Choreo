import "@fontsource-variable/roboto-mono/wght-italic.css";
import "@fontsource-variable/roboto-mono";
import "@fontsource/roboto";
import "./App.css";
import { observer } from "mobx-react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Body from "./Body";
import { ExpressionStore } from "./document/ExpressionStore";
import {parse} from "mathjs";
import ExpressionInput from "./components/input/ExpressionInput";
import InputList from "./components/input/InputList";
import Input from "./components/input/Input";

function App() {
  const expression = ExpressionStore.create({
    expr: parse("0 m"),
    defaultUnit: "m"
  });
  const buttonOverrides = {
    // Name of the slot
    root: ({ ownerState, theme }) => ({
      // Some CSS
      fontSize: "1rem",
      color: "white",
      borderRadius: "10px",
      marginInline: "0.3rem",
      boxSizing: "border-box",
      backgroundColor:
        ownerState.color === "primary" && theme.palette.primary.main,
      "&:hover": {
        backgroundColor:
          ownerState.color === "primary" && theme.palette.secondary.main
      }
    })
  };
  const checkboxOverrides = {
    root: {
      // Some CSS
      color: "white",
      width: 24,
      height: 24
    }
  };
  // theming for mui components
  const themeOptions = {
    palette: {
      mode: "dark",

      primary: { main: "rgb(125, 115, 231)" },
      secondary: { main: "rgb(95, 85, 205)" }
    },
    components: {
      // Name of the component
      MuiButton: { styleOverrides: buttonOverrides },
      MuiIconButton: { styleOverrides: buttonOverrides },
      MuiCheckbox: { styleOverrides: checkboxOverrides }
    }
  };
  return (
    <CssBaseline>
      <ThemeProvider theme={createTheme(themeOptions)}>
        <div style={{backgroundColor:"black"}}>
        <InputList>
        <ExpressionInput number={expression} title={"Expression"} suffix={""} enabled={true} setEnabled={function (value: boolean): void {
          } }></ExpressionInput>
        <ExpressionInput number={expression} title={"Dependent"} suffix={""} enabled={false} setEnabled={function (value: boolean): void {
          } }></ExpressionInput>
          <Input title={"Original"} suffix={"m"} enabled={false} number={0} setNumber={function (newNumber: number): void {
            } } setEnabled={function (value: boolean): void {
            } }></Input>
        </InputList>
</div>
        <Body></Body>
      </ThemeProvider>
    </CssBaseline>
  );
}
export default observer(App);
