pnpm run build
pnpm run build-cli
mkdir test-tmp
cp ./test-jsons/project/0/swerve.chor ./test-tmp/swerve.chor
cp ./test-jsons/trajectory/0/swerve.traj ./test-tmp/swerve.traj

./target/${RUST_TOOLCHAIN}/release/choreo-cli --chor ./test-tmp/swerve.chor --all-trajectory --generate
# Again to test if the cli produced loadable files
./target/${RUST_TOOLCHAIN}/release/choreo-cli --chor ./test-tmp/swerve.chor --all-trajectory --generate
diff ./test-jsons/trajectory/0/swerve.traj ./test-tmp/swerve.traj