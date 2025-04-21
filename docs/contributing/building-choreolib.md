# Building ChoreoLib

Maven artifacts for ChoreoLib can be built using `./gradlew publish` or `./gradlew publishToMavenLocal` for local library access.

The built library will be located in the respective operating system's m2 folder. By default, Maven local repository is defaulted to the `${user.home}/.m2/repository` folder:

=== "Windows"

    ```
    %HOMEPATH%\.m2\repository
    ```

=== "macOS/UNIX"

    ```
    ~/.m2/repository
    ```

To use your build, update `vendordeps/ChoreoLib.json` to point to the local repository and version.

!!! danger
    If you attempt to work with this project in VSCode with WPILib plugins, it will ask you if you want to import the project. Click no. This will change the project into a robot code project and break everything.
