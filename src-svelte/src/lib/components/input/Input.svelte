<script lang="ts">
  import styles from "./InputList.module.css"
  type  Props = {
  /** The text to show before the number */
  title: string;
  /** The text to show before the number */
  suffix: string;
  /** Whether the input should be editable, or else italic and grayed out */
  enabled: boolean;
  /** The value of the input */
  number: number;
  /** The number of decimal places to show when not editing. */
  roundingPrecision: number;
  setNumber: (newNumber: number) => void;
  setEnabled: (value: boolean) => void;
  /** Show a checkbox after the suffix that controls the enabled state of the input */
  showCheckbox: boolean;
  /** Whether or not to show the number when the input is disabled */
  showNumberWhenDisabled: boolean;
  /** The tooltip for the title */
  titleTooltip: string | undefined;
  /** Maximum width of the number input, in monospace characters */
  maxWidthCharacters: number;
  }
  let {
    title, suffix, enabled,
    number,roundingPrecision = 3,
    setNumber, setEnabled,
    showCheckbox = false,
    showNumberWhenDisabled = true,
    titleTooltip = undefined,
    maxWidthCharacters = 10
  } : Props = $props();
  let focused = $state(false);
  let editing = $state(false);
  let editedValue = $state("");
  let inputElemRef: HTMLInputElement;



  const handleSetEnabled = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEnabled(event.target.checked);
  };

  function unfocusedMode() {
      focused = false;
      editing= false;
      editedValue= number.toString();
  }

  function focusedMode() {
      focused =true,
      editing =false,
      editedValue =number.toString()
    inputElemRef.value = number.toString();
    inputElemRef.select();
  }

  function editingMode() {
      focused = true,
      editing = true
  }

  function getDisplayStr(): string {
    if (editing) {
      return editedValue;
    } else {
      if (focused) {
        return number.toString();
      } else {
        return getRoundedStr();
      }
    }
  }

  function getRoundedStr(): string {
    const precision = roundingPrecision ?? 3;
    return (
      Math.round(number * 10 ** precision) /
      10 ** precision
    ).toFixed(precision);
  }

  // componentDidUpdate(
  //   prevProps: Readonly<Props>,
  //   prevState: Readonly<State>,
  //   snapshot?: any
  // ): void {
  //   if (prevProps.number !== number) {
  //     // if the value has changed from the outside, make sure it is no longer
  //     // focused so concise precision is shown.
  //     unfocusedMode();
  //   }
  // }
    let characters = $derived(Math.min(getRoundedStr().length + 3, maxWidthCharacters ?? Infinity));
</script>
<div class="tooltip" data-tip={titleTooltip??""}>
          <span
            class={
              styles.Title +
              " " +
              (enabled ? "" : styles.Disabled) +
              " " +
              (titleTooltip === undefined ? "" : styles.Tooltip)
            }
          >
            {title}
          </span>
        </div>
        <input
        bind:this={inputElemRef}
          type="text"
          class={
            styles.Number +
            (showNumberWhenDisabled ? " " + styles.ShowWhenDisabled : "")
          }
          style={`min-width: ${characters}ch` }
          disabled={!enabled}
          
          onclick={(e) => e.stopPropagation()}
          onfocus={(e) => {
            focusedMode();
          }}
          onblur={(e) => {
            const newNumber = parseFloat(editedValue);
            if (!Number.isNaN(newNumber)) {
              setNumber(newNumber);
            }
            unfocusedMode();
          }}
          onchange={(e) => {
            if (!editing) {
              editingMode();
            }
            editedValue = e.target?.value ?? editedValue;
            e.preventDefault();
          }}
          onkeydown={(e) => {
            if (e.key == "Enter") {
              inputElemRef.blur();
              // let newNumber = parseFloat(state.editedValue);
              // if (!Number.isNaN(newNumber)) {
              //   setNumber(newNumber);
              // }
              // unfocusedMode();
            }
          }}
          value={getDisplayStr()}
          onmousedown={(e) => {
            if (!focused) {
              focusedMode();
              e.preventDefault();
            }
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
        <span
          class={
            styles.Suffix + " " + (enabled ? "" : styles.Disabled)
          }
        >
          {suffix}
        </span>
        {#if showCheckbox}
          <input
            type="checkbox"
            class={styles.Checkbox}
            checked={enabled}
            onchange={handleSetEnabled}
          />
          {:else}
          <span></span>
       {/if}
