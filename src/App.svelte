<script>
  import tiles from "./tiles.js";

  const rows = Array.from(new Set(tiles.map(el => el.row)));
  const columns = Array.from(new Set(tiles.map(el => el.column)));

  let selected = "";

  const selectCountry = function(el, country) {
    selected = country;
  };

  import Modal from "./Modal.svelte";

  let showModal = false;
</script>

<style>
  .centered {
    display: flex;
    position: relative;
    justify-content: center;
    align-items: center;
  }

  .country-row {
    display: grid;
    grid-template-columns: repeat(31, 34px);
    grid-template-rows: repeat(23, 34px);
    grid-gap: 3px;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  @media all and (-ms-high-contrast: none) {
    .country-row {
      display: -ms-grid;
      -ms-grid-template-columns: 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx,
        34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx,
        34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx,
        34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx;
      -ms-grid-template-rows: 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx,
        34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx,
        34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx, 34pxpx,
        34pxpx;
      -ms-grid-gap: 3px;
    }
  }

  .country {
    background-color: white;
    /* margin: 1px; */
    border: 1px solid white;
  }

  .unknown-country {
    background-color: lightgrey;
    /* margin: 1px; */
    border: 1px solid white;
  }

  .selected {
    border: 1px solid rgba(0, 0, 0, 0.1);
  }
</style>

<div class="centered">
  <grid-container class="country-row">
    {#each tiles as country}
      <grid-item
        id={country.id}
        on:click={el => selectCountry(el, country)}
        on:click={() => (selected.name != '' && selected.filename != 'no image' ? (showModal = true) : (showModal = false))}
        class="{selected === country ? 'selected' : 'not-selected'}
        {country.filename !== 'no image' ? 'country' : 'unknown-country'}">
        <!-- {country.name} -->
        {#if country.filename !== '' && country.filename !== 'no image'}
          <img
            src="./static/{country.filename}_thumb.png"
            alt={country.name}
            style="width: 32px; height: 32px" />
        {/if}
      </grid-item>
    {/each}
  </grid-container>
</div>

{#if showModal}
  <Modal on:close={() => (showModal = false)}>
    <h2 slot="header">{selected.name}</h2>
    <img
      src="./static/{selected.filename}.png"
      alt="show your stripes image of {selected.country}"
      style="width: 100%" />

  </Modal>
{/if}
