import { setProjectAnnotations } from "@storybook/react-vite";
import * as a11y from "@storybook/addon-a11y/preview";
import * as preview from "./preview";
import * as docs from "@storybook/addon-docs/preview";

setProjectAnnotations([a11y, docs, preview]);
