---
title: 'Tutorial: Create a Fluid Framework application with React'
menuPosition: 3
---

In this tutorial, you'll learn about using the Fluid Framework by building a simple application that enables every client of the application to change a dynamic time stamp on itself and all other clients almost instantly. You'll also learn how to connect the Fluid data layer with a view layer made in [React](https://reactjs.org/). The following image shows the time stamp application open in four browsers. Each has a button labelled **click** and beside it a UNIX Epoch time. The same time in all four. The cursor is on the button in one browser.

![Four browsers with the Timestamp app open in them.](https://fluidframework.blob.core.windows.net/static/images/Four-clients-1.PNG)

The following image shows the same four clients one second after the **click** button was pressed. Note that the timestamp has updated to the very same time in all four browsers.

![Four browsers with the Timestamp app open in them one second after the button has been pushed.](https://fluidframework.blob.core.windows.net/static/images/Four-clients-2.PNG)

{{< callout note >}}

This tutorial assumes that you are familiar with the [Fluid Framework Overview](../overview.md) and that you have completed the [QuickStart](./quick-start.md). You should also be familiar with the basics of [React](https://reactjs.org/), [creating React projects](https://reactjs.org/docs/create-a-new-react-app.html#create-react-app), and [React Hooks](https://reactjs.org/docs/hooks-intro.html).

{{< /callout >}}

## Create the project

1. Open a Command Prompt and navigate to the parent folder where you want to create the project; e.g., `c:\My Fluid Projects`.
1. Run the following command at the prompt. (Note that the CLI is np**x**, not npm. It was installed when you installed Node.js.)

    ```dotnetcli
    npx create-react-app fluid-react-tutorial --use-npm
    ```

1. The project is created in a subfolder named `fluid-react-tutorial`. Navigate to it with the command `cd fluid-react-tutorial`.
1. The project uses two Fluid libraries:

    |Library |Description |
    |---|---|
    |fluid&#x2011;experimental/fluid&#x2011;framework&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;    |Contains the SharedMap [distributed data structure]({{< relref "dds.md" >}}) that synchronizes data across clients. *This object will hold the most recent timestamp update made by any client.*|
    |fluid&#x2011;experimental/frs&#x2011;client&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;   |Defines the connection to a Fluid service server and defines the starting schema for the [Fluid container][]. In this tutorial, we will use a local test service called Tinylicious.|
    &nbsp;

    Run the following command to install the libraries.

    ```dotnetcli
    npm install @fluid-experimental/frs-client @fluid-experimental/fluid-framework
    ```

## Code the project

1. Open the file `\src\App.js` in your code editor. Delete all the default `import` statements except the one that imports `App.css`. Then delete all the markup from the `return` statement. The file should look like the following:

    ```js
    import './App.css';

    function App() {
      return (

      );
    }

    export default App;
    ```

1. Add the following `import` statements:

    ```js
    import React from "react";
    import { FrsClient, InsecureTokenProvider } from "@fluid-experimental/frs-client";;
    import { SharedMap } from "@fluid-experimental/fluid-framework";
    ```

### Create a container ID helper function

Add the following helper function to the file below the `import` statements. Note the following about this code:

- Every [Fluid container][] must have a unique ID. For the ID, this application will use a truncated version of the UNIX epoch time when the container is first created.
- The ID is stored in the `window.location.hash` property.
- The function is called in a useEffect hook that you create in a later step, so it is called every time the application (re)renders.

```js
const getContainerId = () => {
    let isNew = false;
    if (window.location.hash.length === 0) {
        isNew = true;
        window.location.hash = Date.now().toString();
    }
    const containerId = window.location.hash.substring(1);
    return { containerId, isNew };
};
```

### Configure the `FrsClient`

Add the following constant below the helper function. This object configures the Azure Fluid Relay service client to
connect with a Fluid service that runs on localhost. Note that in a production application, you would use a real security token
service to protect access to the Azure Fluid Relay service (see [Authentication & authorization]({{< relref "auth.md" >}})), but during development you can use the dummy service
`InsecureTokenProvider`.

```js
const frsClientConfig = {
    tenantId: "local",
    tokenProvider: new InsecureTokenProvider("anyValue", { id: "userId" }),
    orderer: "http://localhost:7070",
    storage: "http://localhost:7070",
};
```

### Move Fluid data to the view

1. The Fluid runtime will bring changes made to the timestamp from any client to the current client. But Fluid is agnostic about the UI framework. You can use a helper method to get the Fluid data, from the SharedMap object, into the view layer (the React state). Add the following code below the `FrsClient` configuration constant. This method is called when the application loads the first time, and the value that is returned form it is assigned to a React state property.

    ```js
    const getFluidData = async () => {

        // TODO 1: Configure the container.
        // TODO 2: Get the container from the Fluid service.
        // TODO 3: Return the Fluid timestamp object.
    }
    ```

1. Replace `TODO 1` with the following code. Note that there is only one object in the container: a SharedMap holding the timestamp. Note also that `sharedTimestamp` is the ID of the `SharedMap` object and it must be unique within the container.

    ```js
    const { containerId, isNew } = getContainerId();
    const frsClient = new FrsClient(frsClientConfig);
    const containerSchema = {
        name: 'fluid-react-tutorial-container',
        initialObjects: { sharedTimestamp: SharedMap }
    };
    ```

1. Replace `TODO 2` with the following code. Note that `isNew` was returned by the `getContainerId` helper method and it is true if the application has no Fluid container yet.

    ```js
    const { fluidContainer } = isNew
        ? await frsClient.createContainer({id: containerId}, containerSchema)
        : await frsClient.getContainer({id: containerId}, containerSchema);
    ```

1. Replace `TODO 3` with the following code.

    ```js
    return fluidContainer.initialObjects;
    ```

### Get the Fluid data on application startup

Now that we've defined how to get our Fluid data, we need to tell React to call `getFluidData` when the application starts up and then store the result in state. So add the following code at the top of the `App()` function (above the `return` statement). Note about this this code:

- By setting an empty dependency array at the end of the useEffect, we ensure that this function only gets called once.
- Since `setFluidSharedMap` is a state-changing method, it will cause the React `App` component to immediately rerender.

```js
const [fluidSharedMap, setFluidSharedMap] = React.useState();

React.useEffect(() => {
    getFluidData()
    .then(data => setFluidSharedMap(data));
}, []);
```

### Keep the view synchronized with the Fluid data

The timestamp that is rendered in the application's UI does not come directly from the `fluidSharedMap` state object because that object can be changed by other clients and these changes do not call the `setFluidSharedMap` method, so they do not trigger a rerender of the `App` component. Thus, remote changes would not appear in the current client's UI.

To ensure that both local and remote changes to the timestamp are reflected in the UI, create a second application state value for the local timestamp and ensure that it is updated (with a state-updating function) whenever any client changes the `fluidSharedMap` value.

1. Below the preceding `useEffect` add the following code. Note about this code:

    - The `fluidSharedMap` state is undefined only when the `App` component is rendering for the first time.
    - Passing `fluidSharedMap` in the second parameter of the `useEffect` hook ensures that the hook will not pointlessly run if `fluidSharedMap` has not changed since the last time the `App` component rendered.

    ```js
    const [localTimestamp, setLocalTimestamp] = React.useState();

    React.useEffect(() => {
        if (fluidSharedMap) {

            // TODO 4: Set the value of the localTimestamp state object that will appear in the UI.
            // TODO 5: Register handlers.
            // TODO 6: Delete handler registration when the React App component is dismounted.

        } else {
            return; // Do nothing because there is no Fluid SharedMap object yet.
        }
    }, [fluidSharedMap])
    ```

1. Replace `TODO 4` with the following code. Note about this code:

    - The Fluid `SharedObject.get` method returns the data of the `SharedObject` (in this case the `SharedMap` object), which is roughly the `SharedObject` without any of its methods. So the `setLocalTimestamp` function is setting the `localTimestamp` state to a copy of the data of the `SharedMap` object. (The key "time" that is passed to `SharedObject.get` is created in a later step. It will have been set by the time this code runs the first time.)
    - `updateLocalTimestamp` is called immediately to ensure that `localTimestamp` is initialized with the current shared timestamp value.

    ```js
    const { sharedTimestamp } = fluidSharedMap;
    const updateLocalTimestamp = () => setLocalTimestamp({ time: sharedTimestamp.get("time") });

    updateLocalTimestamp();
    ```

1. To ensure that the `localTimestamp` state is updated whenever the `fluidSharedMap` is changed *even by other clients*, replace `TODO 5` with the following code. Note that because `updateLocalTimestamp` calls the state-setting function `setTimestamp`, a rerender is triggered whenever any client changes the Fluid `fluidSharedMap`.

    ```js
    sharedTimestamp.on("valueChanged", updateLocalTimestamp);
   ```

1. It is a good practice to deregister event handlers when the React component dismounts, so replace `TODO 6` with the following code.

    ```js
    return () => { sharedTimestamp.off("valueChanged", updateLocalTimestamp) }
   ```

### Create the view

Below the `useEffect` hook, replace the `return ();` line with the following code. Note about this code:

- If the `localTimestamp` state has not been initialized, a blank screen is rendered.
- The `sharedTimestamp.set` method sets the *key* of the `fluidSharedMap` object to "time" and the *value* to the current UNIX epoch time. This triggers the `valueChanged` event on the object, so the `updateLocalTimestamp` function runs and sets the `localTimestamp` state to the same object; for example, `{time: "1615996266675"}`. The `App` component rerenders and the `<span>` is updated with the latest timestamp.
- All other clients update too because the Fluid server propagates the change to the `fluidSharedMap` on all of them and this `valueChanged` event updates the `localTimestamp` state on all of them.

```js
if (localTimestamp) {
    return (
        <div className="App">
            <button onClick={() => fluidSharedMap.sharedTimestamp.set("time", Date.now().toString())}>
                Get Time
            </button>
            <span>{localTimestamp.time}</span>
        </div>
    )
} else {
     return <div/>;
}
```

## Start the Fluid server and run the application

In the Command Prompt, run the following command to start the Fluid service. Note that `tinylicious` is the name of the Fluid service that runs on localhost.

```dotnetcli
npx tinylicious
```

Open a new Command Prompt and navigate to the root of the project; for example, `C:/My Fluid Projects/fluid-react-tutorial`. Start the application server with the following command. The application opens in your browser. This may take a few minutes.

```dotnetcli
npm run start
```


Paste the URL of the application into the address bar of another tab or even another browser to have more than one client open at a time. Press the **Get Time** button on any client and see the value change and synchronize on all the clients.

## Next steps

- Try extending the demo with more key/value pairs and a more complex UI
- Consider using the [Fluent UI React controls](https://developer.microsoft.com/fluentui#/) to give the application the look and feel of Microsoft 365. To install them in your project run the following in the command prompt: `npm install @fluentui/react`.
- Try changing the container schema to use a different shared data object type or specify multiple objects in `initialObjects`.

{{< callout tip >}}

When you make changes to the code the project will automatically rebuild and the application server will reload. However, if you make changes to the container schema, they will only take effect if you close and restart the application server. To do this, give focus to the Command Prompt and press Ctrl-C twice. Then run `npm run start` again.

{{< /callout >}}

<!-- AUTO-GENERATED-CONTENT:START (INCLUDE:path=docs/_includes/links.md) -->
<!-- Links -->

<!-- Concepts -->

[Fluid container]: {{< relref "containers-runtime.md" >}}

<!-- Packages -->

[Aqueduct]: {{< relref "/docs/apis/aqueduct.md" >}}
[fluid-framework]: {{< relref "/docs/apis/fluid-framework.md" >}}

<!-- Classes and interfaces -->

[ContainerRuntimeFactoryWithDefaultDataStore]: {{< relref "/docs/apis/aqueduct/containerruntimefactorywithdefaultdatastore.md" >}}
[DataObject]: {{< relref "/docs/apis/aqueduct/dataobject.md" >}}
[DataObjectFactory]: {{< relref "/docs/apis/aqueduct/dataobjectfactory.md" >}}
[Ink]: {{< relref "/docs/apis/ink/ink.md" >}}
[PureDataObject]: {{< relref "/docs/apis/aqueduct/puredataobject.md" >}}
[PureDataObjectFactory]: {{< relref "/docs/apis/aqueduct/puredataobjectfactory.md" >}}
[Quorum]: {{< relref "/docs/apis/protocol-base/quorum.md" >}}
[SharedCell]: {{< relref "/docs/apis/cell/sharedcell.md" >}}
[SharedCounter]: {{< relref "SharedCounter" >}}
[SharedDirectory]: {{< relref "/docs/apis/map/shareddirectory.md" >}}
[SharedMap]: {{< relref "/docs/apis/map/sharedmap.md" >}}
[SharedMatrix]: {{< relref "SharedMatrix" >}}
[SharedNumberSequence]: {{< relref "SharedNumberSequence" >}}
[SharedObjectSequence]: {{< relref "/docs/apis/sequence/sharedobjectsequence.md" >}}
[SharedSequence]: {{< relref "SharedSequence" >}}
[SharedString]: {{< relref "SharedString" >}}

<!-- Sequence methods -->

[sequence.insert]: {{< relref "/docs/apis/sequence/sharedsequence.md#sequence-sharedsequence-insert-Method" >}}
[sequence.getItems]: {{< relref "/docs/apis/sequence/sharedsequence.md#sequence-sharedsequence-getitems-Method" >}}
[sequence.remove]: {{< relref "/docs/apis/sequence/sharedsequence.md#sequence-sharedsequence-getitems-Method" >}}
[sequenceDeltaEvent]: {{< relref "/docs/apis/sequence/sequencedeltaevent.md" >}}

<!-- AUTO-GENERATED-CONTENT:END -->