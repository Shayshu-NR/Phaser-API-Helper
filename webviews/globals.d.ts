import * as _vscode from "vscode";

declare var acquireVsCodeApi: any;

declare global {
    const tsvscode: {
        postMessage : ({type: string, value: any}) => void;
    };
}
