Install ChoreoLib to your robot project by copy pasting the following link into the vendor library installation dialog:

```
https://sleipnirgroup.github.io/ChoreoLib/dep/ChoreoLib.json
```

The installation method is the same as CTRE, PathPlanner, and more. Read more on Vendor Dependencies and their installation (VSCode —> install new library (online)) [here](https://docs.wpilib.org/en/stable/docs/software/vscode-overview/3rd-party-libraries.html#installing-libraries).

## Building Manually

If you attempt to work with this project in VSCode with WPILib plugins, it will ask you if you want to import the project. Click no. This will change the project into a robot code project and break everything.

The maven artifacts can be built using `./gradlew publish` or `./gradlew publishToMavenLocal` for local library access.

The built library will be located in the respective operating system's m2 folder. By default, Maven local repository is defaulted to ${user.home}/.m2/repository folder:

- Unix/Mac OS X - `~/.m2/repository`
- Windows – `C:\Users\{your-username}\.m2\repository`
