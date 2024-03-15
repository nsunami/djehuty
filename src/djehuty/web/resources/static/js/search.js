const enable_subcategories = true;
const page_size = 100;
let filter_info = {};

function init_search_filter_info() {
    jQuery(`.search-filter-content`).each(function() {
        let filter_id = this.id;
        let filter_name = filter_id.split("-").pop();
        filter_info[filter_name] = {
            "id": filter_id,
            "name": filter_name,
            "values": [],
        }

        filter_info[filter_name]["is_multiple"] = this.classList.contains("multiple") ? true : false;
        filter_info[filter_name]["enable_other"] = this.classList.contains("other") ? true : false;
    });
}

function parse_url_params() {
    let url_params = new URLSearchParams(window.location.search);
    let params = {};
    for (let [key, value] of url_params) {
        params[key] = value;
    }
    return params;
}

function toggle_checkbox_subcategories(parent_category_id) {
    let parent_category_checkbox = document.getElementById(`checkbox_categories_${parent_category_id}`);
    let subcategories = document.getElementById(`subcategories_of_${parent_category_id}`);
    if (subcategories === null) {
        return;
    }
    if (parent_category_checkbox.checked) {
        subcategories.style.display = "block";
    } else {
        jQuery(`#subcategories_of_${parent_category_id} input[type='checkbox']`).each(function() {
            this.checked = false;
        });
        subcategories.style.display = "none";
    }
}

function toggle_filter_categories_showmore(flag) {
    if (enable_subcategories) {
        jQuery(`#search-filter-content-categories input[type='checkbox']`).each(function() {
            if (this.id.startsWith("checkbox_categories_")) {
                toggle_checkbox_subcategories(this.id.split("_")[2]);
            }
        });
    }

    if (flag) {
        jQuery('#search-filter-content-categories ul li').css('display', 'none');
        jQuery('#show-categories-more').show();
        if (enable_subcategories) {
            jQuery('#search-filter-content-categories ul li').slice(0, 75).show();
        } else {
            jQuery('#search-filter-content-categories ul li').slice(0, 10).show();
        }
   } else {
       jQuery('#search-filter-content-categories ul li').show();
       jQuery('#show-categories-more').hide();
   }
}

function toggle_filter_apply_button(flag) {
    let color = flag ? "#f49120" : "#eeeeee";
    let cursor = flag ? "pointer" : "default";
    let color_text = flag ? "white" : "#cccccc";
    let classes = flag ? ["enabled", "disabled"] : ["disabled", "enabled"];
    jQuery("#search-filter-apply-button").css("background", color).css("color", color_text).css("cursor", cursor);
    jQuery("#search-filter-apply-button").addClass(classes[0]).removeClass(classes[1]);
}

function toggle_filter_input_text(id, flag) {
    if (flag) {
        jQuery(`#${id}`).show();
    } else {
        jQuery(`#${id}`).val("");
        jQuery(`#${id}`).hide();
    }
}

function register_event_handlers() {
    // reset all checkboxes if the reset button is clicked.
    jQuery("#search-filter-reset-button").click(function() {
        jQuery(`#search-box-wrapper input [type='hidden']`).remove();
        jQuery(".search-filter-content input[type='checkbox']").each(function() {
            this.checked = false;
            jQuery(`.search-filter-content input[type='text']`).each(function() {
                toggle_filter_input_text(this.id, false);
            });
        });
        toggle_filter_apply_button(true);
        toggle_filter_categories_showmore(true);
    });

    // show more categories if 'Show more' text is clicked.
    jQuery('#show-categories-more').click(function() {
        toggle_filter_categories_showmore(false);
    });

    // Enable the apply button if any checkbox is checked.
    jQuery(".search-filter-content input[type='checkbox']").change(function() {
        let is_checked = false;
        jQuery(".search-filter-content input[type='checkbox']").each(function() {
            if (this.checked) {
                toggle_filter_apply_button(true);
                is_checked = true;
                return;
            }
        });

        if (is_checked == false) {
            toggle_filter_apply_button(true);
        }
    });

    // Register events for each filter.
    for (let filter_name of Object.keys(filter_info)) {
        let event_id = "search-filter-content-" + filter_name;
        let is_multiple = filter_info[filter_name]["is_multiple"];

        jQuery(`#${event_id} input[type='checkbox']`).change(function() {
            let target_element = this;
            if (target_element.checked) {
                if (!is_multiple) {
                    jQuery(`#${event_id} input[type='checkbox']`).each(function() {
                        this.checked = false;
                        jQuery(`#${event_id} input[type='text']`).each(function() {
                            this.value = "";
                            toggle_filter_input_text(this.id, false);
                        });
                    });
                    target_element.checked = true;
                }
            }

            if (target_element.id.split("_").pop() === "other") {
                jQuery(`#${event_id} input[type='text']`).each(function() {
                    toggle_filter_input_text(this.id, target_element.checked);
                });
            }
        });
    }

    // When the apply button is clicked, update the URL.
    jQuery("#search-filter-apply-button").click(function() {
        if (jQuery("#search-filter-apply-button").hasClass("disabled")) {
            return;
        }

        if (validate_publisheddate_other()) {
            return;
        }

        jQuery(".search-filter-content input").each(function() {
            if (this.type === "checkbox" && !this.checked) { return; }
            let filter_name = this.id.split("_")[1];
            let value       = this.value;
            if (!(filter_name in filter_info)) { return; }
            if (this.type === "checkbox" && value !== "other") {
                filter_info[filter_name]["values"].push(value);
            } else if (this.type === "text" && value.length > 0) {
                filter_info[filter_name]["other_value"] = value;
            } else {
                return;
            }
        });

        let new_url = window.location.origin + window.location.pathname + "?";
        for (let filter_name of Object.keys(filter_info)) {
            let values = filter_info[filter_name]["values"];
            if (values.length > 0) {
                new_url += `${filter_name}=${values.join(",")}&`;
            }
            if ("other_value" in filter_info[filter_name]) {
                new_url += `${filter_name}_other=${filter_info[filter_name]["other_value"]}&`;
            }
        }

        let search_for = jQuery("#search-box").val();
        if (search_for && search_for.length > 0) {
            new_url += `search=${search_for}&`;
        }

        if (new_url.endsWith("&")) {
            new_url = new_url.slice(0, -1);
        }

        window.location.href = new_url;
    });

    jQuery("#textinput_publisheddate_other").keyup(validate_publisheddate_other);
    jQuery("#textinput_institutions_other").keyup(function() {
        toggle_filter_apply_button(true);
    });
    jQuery("#textinput_filetypes_other").keyup(function() {
        toggle_filter_apply_button(true);
    });

}

function validate_publisheddate_other() {
    let div_error_id = "textinput-publisheddate-other-error";
    let input_id = "textinput_publisheddate_other";
    jQuery(`#${div_error_id}`).show();
    let published_date = jQuery(`#${input_id}`).val();

    if (!published_date) {
        return 0;
    }

    // Date format: YYYY-MM-DD
    try {
        let date_regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!date_regex.test(published_date)) {
            jQuery(`#${div_error_id}`).text("Invalid date format.").css("color", "red");
            jQuery(`#${input_id}`).focus();
            return 1;
        }
        let epoch_time = Date.parse(published_date);
        let epoch_2000 = Date.parse("2000-01-01");
        let epoch_now = Date.now();
        if (isNaN(epoch_time)) {
            jQuery(`#${div_error_id}`).text("Invalid date format.").css("color", "red");
            return 1;
        }

        if (epoch_time > epoch_now) {
            jQuery(`#${div_error_id}`).text("Date cannot be in the future.").css("color", "red");
            return 1;
        }

        if (epoch_time < epoch_2000) {
            jQuery(`#${div_error_id}`).text("Can't be older than 2000.").css("color", "red");
            return 1;
        }
        jQuery(`#${div_error_id}`).text("Valid date format.").css("color", "green");
        toggle_filter_apply_button(true);
        return 0;

    } catch (error) {
        console.log(error);
        jQuery(`#${div_error_id}`).text("Invalid date format.").css("color", "red");
        return 1;
    }
}

function load_search_filters_from_url() {
    let url_params = parse_url_params();
    if (Object.keys(url_params).length > 0) {
        for (let param_name of Object.keys(url_params)) {
            let values = url_params[param_name].split(",");
            let filter_name = param_name;
            let is_other = false;
            if (param_name.endsWith("_other")) {
                filter_name = param_name.split("_")[0];
                is_other = true;
            }

            if (filter_name !== "search" && filter_name !== "page") {
                jQuery(`#search-box-wrapper form`).append(`<input type="hidden" name="${filter_name}" value="${values}">`);
            }

            if (filter_name in filter_info) {
                for (let value of values) {
                    let checkbox_id = `checkbox_${filter_name}_${value}`;
                    let checkbox_id_element = jQuery(`#${checkbox_id}`);
                    if (checkbox_id_element.length > 0) {
                        jQuery(`#${checkbox_id}`).prop("checked", true);
                        if (filter_name == "categories") {
                            toggle_filter_categories_showmore(true);
                            if (enable_subcategories) {
                                toggle_filter_categories_showmore(false);
                            }
                        }
                    }
                }

                if (is_other && "enable_other" in filter_info[filter_name] && url_params[param_name] && url_params[param_name].length > 0) {
                    let other_value = url_params[param_name];
                    let input_text_id = `textinput_${filter_name}_other`;
                    let input_text_id_element = jQuery(`#${input_text_id}`);
                    if (input_text_id_element.length > 0) {
                        input_text_id_element.val(other_value);
                        toggle_filter_input_text(input_text_id, true);
                    }
                    let checkbox_id = `checkbox_${filter_name}_other`;
                    let checkbox_id_element = jQuery(`#${checkbox_id}`);
                    if (checkbox_id_element.length > 0) {
                        jQuery(`#${checkbox_id}`).prop("checked", true);
                    }
                }
            } else {
                continue;
            }
        }
    }
}

function load_search_results() {
    // +-----------------+-----------------+--------------------------------+
    // | db.datasets()   | API args        | Value                          |
    // +=================+=================+================================+
    // | categories      | categories      | Comma separated integers       |
    // | groups          | groups          | A group_id                     |
    // | item_type       | item_type       | djht:defined_type (0, 3, or 9) |
    // | offset          | offset          | A number                       |
    // | limit           | limit           | A number                       |
    // | search_format   | format          | A boolean                      |
    // | order           | order           | 'title', 'published_date'      |
    // | published_since | published_since | DD-MM-YYYY                     |
    // | search_for      | search_for      | A string                       |
    // +-----------------+-----------------+--------------------------------+
    // $ curl -X POST 'https://data.4tu.nl/v2/articles/search' -H 'Content-Type: application/json' --data '{"group": 28589}'

    let api_dataset_url    = "/v2/articles/search";
    let api_collection_url = "/v2/collections/search";
    let request_params     = parse_url_params();
    let target_api_url     = null;

    if ("datatypes" in request_params && request_params["datatypes"] === "collection") {
        target_api_url = api_collection_url;
    } else {
        target_api_url = api_dataset_url;
        request_params["item_type"] = request_params["datatypes"];
    }

    let search_for = null;
    if ("searchscope" in request_params && typeof(request_params["searchscope"]) === "string" && request_params["searchscope"].length > 0) {
        let temp_search_for = "";
        let items = request_params["searchscope"];
        let iterated = 0;
        for (let scope of items.split(",")) {
            iterated += 1;
            temp_search_for += `:${scope}: ${request_params["search"]} OR `;
        }
        if (temp_search_for.endsWith(" OR ")) {
            temp_search_for = temp_search_for.slice(0, -4);
        }
        if (temp_search_for.length > 0) {
            if (iterated > 1) {
                search_for = `( ${temp_search_for} )`;
            } else {
                search_for = `${temp_search_for}`;
            }
        }
    }

    if ("filetypes" in request_params && typeof(request_params["filetypes"]) === "string" && request_params["filetypes"].length > 0) {
        let temp_search_for = "";
        let items = request_params["filetypes"];
        let iterated = 0;
        for (let scope of items.split(",")) {
            iterated += 1;
            temp_search_for += `:format: ${scope} OR `;
        }
        if (temp_search_for.endsWith(" OR ")) {
            temp_search_for = temp_search_for.slice(0, -4);
        }
        if (temp_search_for.length > 0) {
            if (search_for) {
                if (iterated > 1) {
                    search_for += ` AND ( ${temp_search_for} )`;
                } else {
                    search_for += ` AND ${temp_search_for}`;
                }
            } else {
                search_for += `${temp_search_for}`;
            }
        }
    }

    if ("publisheddate" in request_params && typeof(request_params["publisheddate"]) === "string" && request_params["publisheddate"].length > 0) {
        let today = new Date();
        let year = today.getFullYear() - request_params["publisheddate"];
        let new_date = new Date(year, 0, 1);
        let since_date = new_date.toISOString()
        request_params["published_since"] = `${since_date}`;
    }

    if (search_for) {
        request_params["search_for"] = search_for;
    } else {
        request_params["search_for"] = request_params["search"];
    }

    request_params["group"] = request_params["institutions"];
    request_params["page_size"] = page_size;
    if (!("page" in request_params)) {
        request_params["page"] = 1;
    }

    jQuery("#search-loader").show();
    jQuery("#search-error").hide();

    console.log(request_params);

    jQuery.ajax({
        url:         `/v2/articles/search`,
        type:        "POST",
        contentType: "application/json",
        accept:      "application/json",
        data:        JSON.stringify(request_params),
        dataType:    "json"
    }).done(function (data) {
        try {
            if (data.length == 0) {
                let error_message = `No search results...`;
                jQuery("#search-error").html(error_message);
                jQuery("#search-error").show();
            }
            render_search_results(data, request_params["page"]);
        } catch (error) {
            let error_message = `Failed to get search results` +
                                `<br>reason: ${error}`;
            jQuery("#search-error").html(error_message);
            jQuery("#search-error").show();
        }
    }).fail(function (jqXHR, status, error) {
        let error_message = `Failed to get search results` +
                            `<br><br>status: ${status}` +
                            `<br>reason: ${error}`;
        jQuery("#search-error").html(error_message);
        jQuery("#search-error").show();
    }).always(function () {
        jQuery("#search-loader").hide();
    });
}

function render_search_results(data, page_number) {
    let html = "";
    for (let item of data) {
        if (!("timeline" in item)) {
            // Usually, embargoed datasets don't have timeline.
            continue;
        }

        let preview_thumb = "/static/images/dataset-thumb.svg";
        if ("thumb" in item && typeof(item.thumb) === "string" && item.thumb.length > 0 && !(item.thumb.startsWith("https://ndownloader"))) {
            preview_thumb = item.thumb;
        }

        let posted_date = item.timeline.posted;
        if (posted_date.includes("T")) {
            posted_date = posted_date.split("T")[0];
        }

        let revision = null;
        if ("revision" in item.timeline && item.timeline.revision !== null) {
            revision = item.timeline.revision;
        }

        html += `<div class="tile-item">`;
        html += `<a href="${item.url_public_html}">`;
        html += `<img class="tile-preview" src="${preview_thumb}" aria-hidden="true" alt="thumbnail for ${item.uuid}" />`;
        html += `</a>`;
        html += `<div class="tile-matches" id="article_${item.uuid}"></div>`;
        html += `<div class="tile-title"><a href="/datasets/${item.uuid}">${item.title}</a></div>`;

        if (revision) {
            html += `<div class="tile-revision">Revision ${revision}</div>`;
        }
        html += `<div class="tile-date">Posted on ${posted_date}</div>`;
        html += `<div class="tile-authors"> </div>`;
        html += `</div>`;
    }

    html += get_pager_html(data, page_number);
    jQuery(".search-results").html(html);
}

function get_pager_html(data, current_page=1) {
    let prev_page = Number(current_page) - 1;
    let next_page = Number(current_page) + 1;
    let html = "";

    if (data.length < page_size) {
        if (current_page === 1) {
            prev_page = null;
            next_page = null;
        } else {
            next_page = null;
        }
    } else {
        if (current_page === 1) {
            prev_page = null;
        }
    }

    let new_url_link = new URL(window.location.href);
    new_url_link.searchParams.delete('page');
    html += `<div class="search-results-pager">`;
    if (prev_page) {
        new_url_link.searchParams.append('page', prev_page);
        html += `<div><a href="${new_url_link.href}" class="pager-prev">Previous</a></div>`;
    } else {
        html += `<div></div>`;
    }

    if (next_page) {
        new_url_link.searchParams.append('page', next_page);
        html += `<div><a href="${new_url_link.href}" class="pager-next">Next</a></div>`;
    } else {
        html += `<div></div>`;
    }
    html += `</div>`;

    return html;
}
