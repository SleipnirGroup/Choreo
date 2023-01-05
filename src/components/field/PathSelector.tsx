import { FormControlLabel, IconButton, MenuItem, Radio, RadioGroup, Select, SelectChangeEvent, TextField } from '@mui/material'
import { observer } from 'mobx-react';
import React, { Component } from 'react'
import DocumentManagerContext from '../../document/DocumentManager';
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'

type Props = {}

type State = {}

type OptionProps = {uuid:string;}
type OptionState = {renaming:boolean, renameError:boolean}

class PathSelectorOption extends Component<OptionProps, OptionState> {
    static contextType = DocumentManagerContext;
    declare context: React.ContextType<typeof DocumentManagerContext>;
    state={renaming:false, renameError:false}
    nameInputRef  = React.createRef<HTMLInputElement>();
    getPath() {
        return this.context.model.pathlist.paths.get(this.props.uuid)!;

    }
    startRename() {
        this.setState({renaming:true});
        this.nameInputRef.current!.value = this.getPath().name;
        
    }
    stopRename() {
        console.log(this.nameInputRef.current);
        if (!this.checkName()) {
            this.getPath().setName(this.nameInputRef.current!.value)
            this.setState({renaming:false})
        }

    }
    checkName() :boolean {
        
        let error = this.searchForName(this.nameInputRef.current!.value);
        this.setState({renameError:error})
        console.log(error)
        return error
    }
    searchForName(name:string) : boolean {
        console.log(Array.from(this.context.model.pathlist.paths.keys()))
        let didFind = (
        Array.from(this.context.model.pathlist.paths.keys())
        .filter((uuid)=>uuid!=this.props.uuid)
        .map((uuid)=>this.context.model.pathlist.paths.get(uuid)!.name)
        .find((existingName)=>existingName === name) !== undefined
        );
        return didFind;
    }
    render() {
        console.log("render", this.props.uuid, JSON.stringify(this.context.model.pathlist, undefined, 4))
        // this is here to use the data we care about during actual rendering
        // so mobx knows to rerender this component when it changes
        this.searchForName("");

        return (<span style={{display:'flex', justifyContent:'space-between'}}>
                <TextField variant="filled" inputRef={this.nameInputRef}
                error={this.state.renameError}
                style={{display:(this.state.renaming ? "block": 'none'), maxWidth:'100%', height:'1.2rem', verticalAlign:'middle'}}
                onChange={()=>this.checkName()}
                onKeyPress={(event) => {
                    if (event.key === 'Enter'){
                       this.stopRename();   
                 }}}
                sx={{
                    ".MuiInputBase-root":{
                        height:'2rem',

                    }
                }}
                ></TextField>
                <span style={{
                    display:(this.state.renaming ? "none": 'inline-block'),
                    flexGrow:1, whiteSpace:'nowrap', overflow:'hidden',
                    textOverflow:'ellipsis', marginTop:'auto', marginBottom:'auto'
                }}>
                    {this.getPath().name}
                </span>
                <span style={{minWidth:'calc(96px + 0.3rem)'}}>
                <IconButton onClick={(e)=>{e.stopPropagation(); this.startRename();}}><EditIcon></EditIcon></IconButton>
                <IconButton onClick={(e)=>{e.stopPropagation(); this.context.model.pathlist.deletePath(this.props.uuid);}}><DeleteIcon></DeleteIcon></IconButton>
                </span>

                
        </span>);
    }
}

class PathSelector extends Component<Props, State> {
    static contextType = DocumentManagerContext;
    declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {}

  Option = observer(PathSelectorOption);
  render() {
    console.log(this.context.model.pathlist.activePathUUID)
    return (
        <div style={{
            position:'absolute', bottom:0, left:0, width:'100%',
        pointerEvents:"all",
        background:'var(--background-light-gray)',
        padding:'20px 10px',

        color:'white',zIndex:2000}}>
      <RadioGroup 
      sx={{
        marginLeft:'auto',
        marginRight:'auto',
        width:'50%',
        minWidth:'200px',
        ".MuiFormControlLabel-label":{
            flexGrow:1
        }
      }} value={this.context.model.pathlist.activePathUUID} onChange={(event: SelectChangeEvent<string>) => {
        this.context.model.pathlist.setActivePathUUID(event.target.value);

      }}>
        {Array.from(this.context.model.pathlist.paths.keys()).map((uuid)=>(
            <FormControlLabel value={uuid} control={<Radio/>} label={<this.Option uuid={uuid}></this.Option>}></FormControlLabel>
        ))}
      </RadioGroup>
      </div>
    )
  }
}
export default observer(PathSelector);