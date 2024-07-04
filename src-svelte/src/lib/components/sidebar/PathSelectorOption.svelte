<script lang="ts">
// @ts-nocheck

    import {derived} from "svelte/store";
    import { dialog } from "@tauri-apps/api";
    import Input from "../input/Input.svelte";
    import InputList from "../input/InputList.svelte";
    import styles from "./Sidebar.module.css";
    let {id, selected} : {id:number, selected:boolean} = $props();
    let renaming = $state(false);
    let renameError = $state(false);
    const originalName= `Path ${id}`;
    let name= $state(originalName);
    let settingsOpen = $state(false);

  let nameInputRef: HTMLInputElement;

  const startRename = () =>{
    renaming = true;
    nameInputRef.value = name;
  }
  const completeRename = () => {
    if (!checkName()) {
        let newName = nameInputRef.value;
        console.log("renamed to", newName);
    }
    escapeRename();
  }
  const escapeRename =()=> {
    renaming = false;
    renameError = false;
    name = originalName;
  }
  const checkName = (): boolean => {
    const inputName = nameInputRef.value;
    const error =
      inputName.length == 0 ||
      inputName.includes("/") ||
      inputName.includes("\\") ||
      inputName.includes(".") ||
      searchForName(inputName);
    renameError=error;
     name = inputName;
    return error;
  }
  const searchForName = (name: string) :boolean => {
    return false;
    // const didFind =
    //   Array.from(this.context.model.document.pathlist.paths.keys())
    //     .filter((uuid) => uuid !== this.props.uuid)
    //     .map(
    //       (uuid) => this.context.model.document.pathlist.paths.get(uuid)!.name
    //     )
    //     .find((existingName) => existingName === name) !== undefined;
    // return didFind;
  }
  let generating = false;
  let stale = false;
</script>
      <a href={`/paths/${id}`}
        class={styles.SidebarItem + " " + (selected ? styles.Selected : "")}
        style="borderWidth: 0; border-left-width: 4; height: auto;"
      >
      {#if generating}
        
            <span class="loading loading-spinner"></span>
        {:else if stale}
        <div class="tooltip" data-tip="Path features no longer match trajectory. Regenerate to be up-to-date.">
            !
        </div>
        {:else}
            R
        {/if}
        <input type="text"
            class={
                styles.SidebarLabel + 
                "block max-w-full flex-grow align-middle h-6 p-1 -ml-1" +
                " input input-bordered"
            }
            bind:this={nameInputRef}
            onchange={()=>checkName()}
            value={name}
            onkeydown={(event) => {
                if (event.key == "Enter") {
                  completeRename();
                  nameInputRef.blur();
                }
                if (event.key == "Escape") {
                  escapeRename();
                }
              }}
            onfocus={(e) => {
            e.preventDefault();
            }}
            ondoubleclick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startRename();
            nameInputRef.focus();
            }}
            onblur={() => completeRename()}
            ondoubleclickcapture={(e)=>{
                e.stopPropagation();
            startRename();
            setTimeout(() => nameInputRef.select(), 0.001);}
            }
        >
        <div>
            <div class="tooltip" data-tip="PathConfig">
                <button class="btn btn-square btn-ghost"
                onclick={(e) => {
                    e.stopPropagation();
                    settingsOpen = !settingsOpen;
                  }}
                >
                {#if settingsOpen}
                C {:else} V {/if}
            </button>
            </div>
            <div class="tooltip" data-tip="Delete Path">
                <button class="btn btn-square btn-ghost"
                onclick={(e)=>{
                e.stopPropagation();
                    dialog
                      .confirm(`Delete "${originalName}"?`)
                      .then((result) => {
                        if (result) {
                          //this.context.deletePath(this.props.uuid);
                        }
                      });
                    }}
                >
                Del
            </button>
            </div>
        </div>
        <!-- {/* Settings part */} -->
        {#if settingsOpen}

            <span class={styles.SidebarVerticalLine}></span>
            <div class="tooltip" data-tip="Estimate needed resolution (# of samples) based on distance between waypoints">

            </div>
              <!-- <FormControlLabel
                sx={{
                  marginLeft: "0px",
                  gridColumnStart: 2,
                  gridColumnEnd: 4
                }}
                label="Guess Path Detail"
                control={
                  <Checkbox
                    checked={this.getPath().usesControlIntervalGuessing}
                    onChange={(e) => {
                      this.getPath().setControlIntervalGuessing(
                        e.target.checked
                      );
                    }}
                  />
                }
              />
            </Tooltip>-->
            <span class={styles.SidebarVerticalLine}></span>
            <span style="grid-column-start: 2; grid-column-end: 4">
              <InputList noCheckbox>
                <Input
                  title="Default"
                  suffix="per segment"
                  showCheckbox={false}
                  enabled={true}
                  setEnabled={(_) => {}}
                  roundingPrecision={0}
                  number={40}
                  setNumber={(count) => {
                    
                  }}
                  titleTooltip="When not guessing, how many samples to use?"
                ></Input>
              </InputList>
            </span>
            {/if}
          </a>
