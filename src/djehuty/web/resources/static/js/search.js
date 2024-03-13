const enable_subcategories = true;
let filter_info = {};

function get_search_filter_info() {
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

function extra_render_search_page(articles, display_terms) {
    let articles_fields = {};

    // In fact, articles don't have tag field.
    let fields_mapping = {
        "title":          {"short_name": "title",    "long_name": "Keyword(s) found in Title"},
        "resource_title": {"short_name": "resource", "long_name": "Keyword(s) found in Resource Title"},
        "description":    {"short_name": "desc",     "long_name": "Keyword(s) found in Description"},
        "citation":       {"short_name": "cite",     "long_name": "Keyword(s) found in Citation"},
        "format":         {"short_name": "format",   "long_name": "Keyword(s) found in Format"},
        "tag":            {"short_name": "tag",      "long_name": "Keyword(s) found in Keyword"}
    }

    let enable_fields_palette = false;
    let fields_pallet = {
        "title":          "#FF70A6",
        "resource_title": "#F570FF",
        "description":    "#FF9770",
        "citation":       "#FFB700",
        "format":         "#ABC900",
        "tag":            "#9EBA00"
    };

    articles.forEach(function (article, article_index) {
        let match_fields = [];
        display_terms.forEach(function (display_term) {
            // if display_term's type is not string, then skip.
            if (typeof display_term !== "string") {
                return;
            }

            // if display_term has '^:.+: ' in regular expression, then remove it.
            display_term = display_term.replace(/^:.+: /, "");
            for (let field_name in fields_mapping) {
                if (field_name in article && article[field_name].toLowerCase().includes(display_term.toLowerCase())) {
                    match_fields.push(field_name);
                }
            }
        });
        let div_match = document.getElementById(`article_${(article_index + 1)}`);
        let match_fields_uniq = match_fields.filter((value, index) => match_fields.indexOf(value) === index);
        if (match_fields_uniq.length > 0) {
            articles_fields[article_index] = match_fields_uniq;
        } else {
            articles_fields[article_index] = ["tag"];
        }

        if (article_index in articles_fields) {
            articles_fields[article_index].forEach(function (match_field) {
                if (enable_fields_palette) {
                    jQuery(`<span class="match-badge" style="background-color: ${fields_pallet[match_field]}" title="${fields_mapping[match_field]["long_name"]}">${fields_mapping[match_field]["short_name"]}</span>`).appendTo(div_match);
                } else {
                    jQuery(`<span class="match-badge" title="${fields_mapping[match_field]["long_name"]}">${fields_mapping[match_field]["short_name"]}</span>`).appendTo(div_match);
                }
            });
        }
    });

    jQuery('#list_view_mode').click(function() {
        jQuery('.tile-item').hide();
        jQuery('.list-item').show();
        jQuery('#tile_view_mode').css('color', 'darkgray');
        jQuery('#list_view_mode').css('color', '#f49120');

        if (jQuery('.list-item').html().length === 0) {
            jQuery("#search-result-wrapper").addClass("loader");
            jQuery("#search-result tbody tr").css('opacity', '0.15');

            let table_html = '';
            table_html += '<table id="search-result" class="corporate-identity-table">';
            table_html += '<thead><tr><th>Dataset</th><th style="padding-right:20px;">Posted On</th></tr></thead>';
            table_html += '<tbody>';
            articles.forEach(function (article, article_index) {
                let posted_on = article.timeline_posted;
                let title = article.title;
                if (posted_on.includes("T")) {
                    posted_on = posted_on.split("T")[0];
                }
                let badge_html = '';
                let badge_string_length = 0;
                if (article_index in articles_fields) {
                    articles_fields[article_index].forEach(function (match_field) {
                        if (enable_fields_palette) {
                            badge_html += `<span class="match-badge" style="background-color: ${fields_pallet[match_field]}" title="${fields_mapping[match_field]["long_name"]}">${fields_mapping[match_field]["short_name"]}</span>`;
                        } else {
                            badge_html += `<span class="match-badge" title="${fields_mapping[match_field]["long_name"]}">${fields_mapping[match_field]["short_name"]}</span>`;
                        }
                        badge_string_length += fields_mapping[match_field]["short_name"].length;
                    });
                }
                if (badge_string_length) {
                    badge_string_length += 10;
                }
                max_title_length = 150 - badge_string_length;
                if (title.length > max_title_length) {
                    title = title.substring(0, max_title_length) + '...';
                }
                table_html += '<tr>';
                table_html += `<td><div style="float: left;"><a href="/datasets/${article.container_uuid}">${title}</a></div><div style="float: right;">${badge_html}</div></td><td style="padding-right:20px;">${posted_on}</td>`;
                table_html += '</tr>';
            });
            table_html += '</tbody></table>';

            jQuery('.list-item').html(table_html);

            jQuery("#search-result").DataTable({
                "order": [[ 1, 'desc' ]],
                "bInfo" : false,
                "paging": false,
                "searching": false,
                "lengthChange": false,
            });

            jQuery("#search-result").show();
        };
    });

    jQuery('#tile_view_mode').click(function() {
        jQuery('.list-item').hide();
        jQuery('.tile-item').show();
        jQuery('#list_view_mode').css('color', 'darkgray');
        jQuery('#tile_view_mode').css('color', '#f49120');
    });
};

function checkbox_subcategories_toggle(parent_category_id) {
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

function filter_categories_showmore_toggle(flag) {
    if (enable_subcategories) {
        jQuery(`#search-filter-content-categories input[type='checkbox']`).each(function() {
            if (this.id.startsWith("checkbox_categories_")) {
                checkbox_subcategories_toggle(this.id.split("_")[2]);
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

function filter_apply_button_toggle(flag) {
    let color = flag ? "#f49120" : "#eeeeee";
    let cursor = flag ? "pointer" : "default";
    let color_text = flag ? "white" : "#cccccc";
    let classes = flag ? ["enabled", "disabled"] : ["disabled", "enabled"];
    jQuery("#search-filter-apply-button").css("background", color).css("color", color_text).css("cursor", cursor);
    jQuery("#search-filter-apply-button").addClass(classes[0]).removeClass(classes[1]);
}

function filter_input_text_toggle(id, flag) {
    if (flag) {
        jQuery(`#${id}`).show();
    } else {
        jQuery(`#${id}`).val("");
        jQuery(`#${id}`).hide();
    }
}

function register_search_events() {
    // reset all checkboxes if the reset button is clicked.
    jQuery("#search-filter-reset-button").click(function() {
        jQuery(".search-filter-content input[type='checkbox']").each(function() {
            this.checked = false;
            jQuery(`.search-filter-content input[type='text']`).each(function() {
                filter_input_text_toggle(this.id, false);
            });
        });
        filter_apply_button_toggle(true);
        filter_categories_showmore_toggle(true);
    });

    // show more categories if 'Show more' text is clicked.
    jQuery('#show-categories-more').click(function() {
        filter_categories_showmore_toggle(false);
    });

    // Enable the apply button if any checkbox is checked.
    jQuery(".search-filter-content input[type='checkbox']").change(function() {
        let is_checked = false;
        jQuery(".search-filter-content input[type='checkbox']").each(function() {
            if (this.checked) {
                filter_apply_button_toggle(true);
                is_checked = true;
                return;
            }
        });

        if (is_checked == false) {
            filter_apply_button_toggle(true);
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
                            filter_input_text_toggle(this.id, false);
                        });
                    });
                    target_element.checked = true;
                }
            }

            if (target_element.id.split("_").pop() === "other") {
                jQuery(`#${event_id} input[type='text']`).each(function() {
                    filter_input_text_toggle(this.id, target_element.checked);
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
        filter_apply_button_toggle(true);
    });
    jQuery("#textinput_filetypes_other").keyup(function() {
        filter_apply_button_toggle(true);
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
        filter_apply_button_toggle(true);
        return 0;

    } catch (error) {
        console.log(error);
        jQuery(`#${div_error_id}`).text("Invalid date format.").css("color", "red");
        return 1;
    }
}

function read_filters_from_url() {
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
            if (filter_name in filter_info) {
                for (let value of values) {
                    let checkbox_id = `checkbox_${filter_name}_${value}`;
                    let checkbox_id_element = jQuery(`#${checkbox_id}`);
                    if (checkbox_id_element.length > 0) {
                        jQuery(`#${checkbox_id}`).prop("checked", true);
                        if (filter_name == "categories") {
                            filter_categories_showmore_toggle(true);
                            if (enable_subcategories) {
                                filter_categories_showmore_toggle(false);
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
                        filter_input_text_toggle(input_text_id, true);
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


