<script>
  import tiles from "./tiles.js";

  const rows = Array.from(new Set(tiles.map(el => el.row)));
  const columns = Array.from(new Set(tiles.map(el => el.column)));

  let selected = "";

  const selectCountry = function(el, country) {
    selected = country;
    // el.fromElement.scrollIntoView({
    //   behavior: "smooth",
    //   block: "end",
    //   inline: "nearest"
    // });
    // console.log(el);
  };
</script>

<style>
  /* 10px border */

  .centered {
    display: flex;
    /* flex-wrap: wrap; Optional. only if you want the items to wrap */
    justify-content: center; /* For horizontal alignment */
    align-items: center; /* For vertical alignment */
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
    /* position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%); */
  }
</style>

<!-- <p>sdfsdf {selected.name}</p> -->
<div class="centered">
  <grid-container class="country-row">
    {#each tiles as country}
      <grid-item
        id={country.id}
        on:mouseover={el => selectCountry(el, country)}
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

<!-- <p>selected: {selected.name}</p> -->

<!-- <p>rows: {rows}</p> -->

<!-- <p>columns: {columns}</p> -->
