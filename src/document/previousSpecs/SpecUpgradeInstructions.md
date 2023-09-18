# To make a change in the document spec

1. Copy-paste the latest \<version\>.ts in this directory and rename it with the new version number.
2. In \<newVersion\>.ts, update SAVE_FILE_VERSION, make desired changes, and describe the changes in the
   comment at the top.
3. In DocumentSpecTypes.ts:

- Copy-paste the import block for the previous version as described in the comments of that file.
- Edit the version number within the import block to create a new set of imports referencing the document types for the new version.
- Add an entry to VERSIONS. The key is the SAVE*FILE_VERSION of the previous (\_not new*) version, and the value is an object containing the upgrade function from the previous version's document type to the new version's document type. For example, t:

```ts
export let VERSIONS = {
   ...
 "v0.0.0": {
   up: (document: any) : v0_0_1 => {
     document = document as v0_0_0; // Passing as any and asserting as v0_0_0
     // lets us call the upgrade on a generic "document" type
     let updated: v0_0_1 = {paths: {},
       version: v0_0_1_Version,
       robotConfiguration: document.robotConfiguration};
   //  ...transfer properties from "document" to "updated
   return updated;
     }
   }

 ,
```
