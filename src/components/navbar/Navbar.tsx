import { randomUUID } from 'crypto';
import React, { Component } from 'react';
import Select, { OptionProps, components } from 'react-select';
import DocumentManagerContext from '../../document/DocumentManager';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faTrash
} from "@fortawesome/free-solid-svg-icons";
import styles from './Navbar.module.css';

type Props = {};

type State = {};

type PathOption = {
  uuid: string
};

class PathOptionContainer {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render(props: OptionProps<PathOption>) {
    return (
      <div className="optionContainer">
        <components.Option {...props}>
          {props.children}
          <button
            className="renameButton"
            onClick={(event) => {
              const path = this.context.model.pathlist.paths.get(props.data.uuid);
              if (path !== undefined) {
                path.name = 'renamed';
              }
              // let newName = prompt('Enter new name: ');
              // if (newName !== null) {
                console.log('rename');
              // }
            }}
          >
            <FontAwesomeIcon
            className="renameIcon"
            icon={faEdit}
          />
          </button>
          <button
            className="deleteButton"
            onClick={(event) => {
            }}
          >
            <FontAwesomeIcon
            className="deleteIcon"
            icon={faTrash}
          />
          </button>
        </components.Option>
      </div>
    );
  }
}
//  (props: OptionProps<PathOption>) => {
//   static contextType = DocumentManagerContext;
//   const context!: React.ContextType<typeof DocumentManagerContext>;
//   return (
//     <div className="optionContainer">
//       <components.Option {...props}>
//         {props.children}
//         <button
//           className="renameButton"
//           onClick={(event) => {
//             // let newName = prompt('Enter new name: ');
//             // if (newName !== null) {
//               console.log('rename');
//             // }
//           }}
//         >
//           <FontAwesomeIcon
//           className="renameIcon"
//           icon={faEdit}
//         />
//         </button>
//         <button
//           className="deleteButton"
//           onClick={(event) => {
//           }}
//         >
//           <FontAwesomeIcon
//           className="deleteIcon"
//           icon={faTrash}
//         />
//         </button>
//       </components.Option>
//     </div>
//   );
// };

export default class Navbar extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    return (
      <div className={styles.Container}>
        <span className={styles.PathChooserContainer}>
          <Select<PathOption>
                  isSearchable={false}
                  components={{ Option: new PathOptionContainer().render }}
                  styles={{
                    control: (baseStyles, state) => ({
                      ...baseStyles,
                      backgroundColor: '#7D73E7',
                      borderWidth: 0,
                      borderRadius: 10,
                      width: 200,
                      height: 20
                    }),
                    option: (styles, { data, isDisabled, isFocused, isSelected }) => {
                      return {
                        ...styles,
                        backgroundColor: 
                          isDisabled ? undefined
                            : isSelected
                              ? '#FFC52F' 
                                : isFocused
                                  ? '#5F55CD' : undefined,
                        color: 'white',
                        cursor: isDisabled ? "not-allowed" : "default",
                        marginLeft: 4,
                        marginRight: 0,
                        marginBottom: 4,
                        width: 192,
                        borderRadius: 5,
                  
                        ":active": {
                          ...styles[":active"],
                          backgroundColor: isDisabled ? undefined
                            : isSelected ? 'FFC52F' : '#5F55CD'
                        }
                      };
                    },
                    singleValue: (styles, { data }) => ({ ...styles, color: 'white' }),
                    menu: base => ({
                      ...base,
                      backgroundColor: '#7D73E7'
                    })
                  }}
                  onChange={pathOption => {if (pathOption?.uuid !== null && pathOption?.uuid !== undefined) this.context.model.pathlist.setActivePathUUID(pathOption.uuid);}}
                  options={Array.from(this.context.model.pathlist.paths.keys())
                             .map(key => this.context.model.pathlist.paths.get(key))
                             .map(path => {
                              if (path?.uuid !== null && path?.uuid !== undefined) {
                                return {uuid: path?.uuid};
                              } else {
                                return {uuid: randomUUID()};
                              }
                            })}
                  // value={{uuid: this.context.model.pathlist.paths.get('one')?.uuid}}
                  getOptionLabel={(option) => {
                    const path = this.context.model.pathlist.paths.get(option.uuid);
                    if (path !== undefined && path.name !== undefined) {
                      return path.name;
                    } else {
                      return option.uuid;
                    }
                  }}
                  getOptionValue={(option) => option.uuid}
          />
          <button id="addPath">+</button>
        </span>
        <h1>
          Untitled Waypoint Editor
        </h1>
        <span>
        <button id="save" onClick={()=>{this.context.model.saveFile()}}>Save Document JSON</button>
          <button id="generatePath" onClick={()=>this.context.model.pathlist.activePath.generatePath()}>Generate Path</button>
        </span>
      </div>
    )
  }
}