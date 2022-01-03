/// <reference types="svelte" />
declare global {
    const tsvscode: {
        postMessage : ({type: string, value: any}) => void;
    };
}
