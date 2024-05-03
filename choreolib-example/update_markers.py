from pathlib import Path
import os
import json

def main():
    deploy_directory: Path = Path(__file__).parent.joinpath('src/main/deploy/choreo')

    print(f'Updating markers in {deploy_directory}')

    for file in deploy_directory.iterdir():
        print(f'    Updating {file}')
        data: dict = {}
        if file.is_file() and file.suffix == '.traj':
            with open(file, 'r') as f:
                data = json.load(f)

            data['name'] = file.stem

            if 'eventMarkers' in data:
                data['events'] = make_new_markers(data['eventMarkers'])
            else:
                data['events'] = []

            with open(file, 'w') as f:
                json.dump(data, f, indent=4)


def make_new_markers(old_markers: list[dict]) -> list[dict]:
    new_markers: list[dict] = []
    for marker in old_markers:
        if 'command' not in marker:
            continue
        command: dict = marker['command']
        if 'type' not in command:
            continue
        if command['type'] != 'named':
            continue
        new_marker = {
            'timestamp': marker['timestamp'],
            'event': command['data']['name']
        }
        new_markers.append(new_marker)
    return new_markers


if __name__ == '__main__':
    main()