<script>
  let countries = [
    ["leeg", "leeg", "nl"],
    ["be", "vs", "leeg"],
    ["fa", "leeg", "es"]
  ];

  let selected = "es";

  const selectCountry = function(el, country) {
    country != "leeg" ? (selected = country) : "";
    // el.fromElement.scrollIntoView({
    //   behavior: "smooth",
    //   block: "end",
    //   inline: "nearest"
    // });
    // console.log(el);
  };
</script>

<style>
  .country-row {
    display: grid;
    grid-template-rows: 50px 50px 50px;
    grid-template-columns: 200px 200px 200px;
  }
  .country {
    background-color: lightgrey;
    margin: 10px;
  }

  .selected {
    /* zoom: 150%; */
    transform: scale(2.7);
    /* position: relative; */
    /* z-index: 1; */
  }
</style>

{#each countries as countryrow}
  <div class="country-row">
    {#each countryrow as country}
      <div
        id={country}
        on:mouseover={el => selectCountry(el, country)}
        class="{selected === country ? 'selected' : 'not-selected'} country">
        {country}
      </div>
    {/each}
  </div>
{/each}
