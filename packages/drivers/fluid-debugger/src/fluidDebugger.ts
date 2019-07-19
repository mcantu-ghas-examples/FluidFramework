/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IDocumentService, IDocumentServiceFactory } from "@prague/container-definitions";
import { ReplayDocumentService, ReplayDocumentServiceFactory } from "@prague/replay-socket-storage";
import { DebugReplayController } from "./fluidDebuggerController";
import { DebuggerUI } from "./fluidDebuggerUI";

// tslint:disable-next-line:no-namespace
export namespace FluidDebugger {
    /**
     * Creates document service wrapper that pops up Debugger window and allows user to play ops one by one.
     * User can chose to start with any snapshot, or no snapshot.
     * If pop-ups are disabled, we continue without debugger.
     * @param documentService - original document service to use to fetch ops / snapshots.
     */
    export async function createFromService(
            documentService: IDocumentService): Promise<IDocumentService> {
        const controller = createFluidDebugger();
        if (!controller) {
            return documentService;
        }
        return ReplayDocumentService.create(documentService, controller);
    }

    export async function createFromServiceFactory(
            documentServiceFactory: IDocumentServiceFactory) {
        const controller = createFluidDebugger();
        if (!controller) {
            return documentServiceFactory;
        }
        return new ReplayDocumentServiceFactory(
            documentServiceFactory,
            controller,
        );
    }

    /**
     * Binds DebuggerUI & DebugReplayController together
     * These classes do not know each other and talk through interfaces
     */
    function createFluidDebugger() {
        return DebugReplayController.create((controller) => {
            return DebuggerUI.create(controller);
        });
    }
}
