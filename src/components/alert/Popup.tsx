import React, { Component } from "react";

import DocumentManagerContext from "../../document/DocumentManager";
import { Box } from "@mui/material";

type Props = {};

type State = {};

export class Popup extends Component<Props, State> {
    static contextType = DocumentManagerContext;
    context!: React.ContextType<typeof DocumentManagerContext>;
    state = {};

    render() {
        return <Box>
            <h4>
                ":3"
            </h4>
        </Box>
    }
}