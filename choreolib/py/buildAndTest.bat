:: Uninstall if it already was installed
pip uninstall -y choreolib

:: Build wheel
python setup.py bdist_wheel

:: Install whatever wheel was made
for %%f in (dist/*.whl) do (
    echo installing dist/%%f
    pip install --no-cache-dir dist/%%f
)

:: Run the test suite
pytest
